import type { Socket } from 'socket.io';
import * as docker from './docker.js';
import * as files from './files.js';
import type { ReleaseChannel } from './servers.js';
import * as updater from './updater.js';

export interface DownloadStatus {
  status: 'starting' | 'auth-required' | 'output' | 'error' | 'extracting' | 'complete' | 'done';
  message: string;
  code?: 'CONTAINER_NOT_RUNNING' | 'CONTAINER_NOT_FOUND' | 'DOWNLOAD_FAILED';
  serverId?: string;
}

export interface DownloadResult {
  success: boolean;
  code?: 'CONTAINER_NOT_RUNNING' | 'CONTAINER_NOT_FOUND' | 'DOWNLOAD_FAILED';
  error?: string;
}

function isAuthExpiredOutput(message: string): boolean {
  const lowered = message.toLowerCase();
  return lowered.includes('invalid_grant') || lowered.includes('refresh token expired');
}

function isAuthRequiredOutput(message: string): boolean {
  return (
    message.includes('oauth.accounts.hytale.com') ||
    message.includes('user_code') ||
    message.includes('Authorization code')
  );
}

function isAuthForbiddenOutput(message: string): boolean {
  return message.includes('403') || message.includes('Forbidden');
}

export async function downloadServerFiles(
  socket: Socket,
  containerName?: string,
  serverId?: string,
  _channel?: ReleaseChannel
): Promise<DownloadResult> {
  try {
    const status = await docker.getStatus(containerName);
    if (!status.running) {
      const message = 'Server is offline. Start it from Control tab and try again.';
      socket.emit('download-status', {
        status: 'error',
        code: 'CONTAINER_NOT_RUNNING',
        message,
        serverId
      } satisfies DownloadStatus);
      return {
        success: false,
        code: 'CONTAINER_NOT_RUNNING',
        error: message
      };
    }

    const c = await docker.getContainer(containerName);
    if (!c) {
      const message = 'Server container was not found. Check your server setup.';
      socket.emit('download-status', {
        status: 'error',
        code: 'CONTAINER_NOT_FOUND',
        message,
        serverId
      } satisfies DownloadStatus);
      return {
        success: false,
        code: 'CONTAINER_NOT_FOUND',
        error: message
      };
    }

    socket.emit('download-status', {
      status: 'starting',
      message: 'Starting download...',
      serverId
    } satisfies DownloadStatus);

    await docker.execCommand('rm -f /opt/hytale/.download_attempted', 30000, containerName);

    console.log('Starting hytale-downloader with streaming');

    // Use /opt/hytale for download path - works better with x64 emulation on ARM64
    const downloadPath = '/opt/hytale/.download-temp';
    const zipPath = `${downloadPath}/hytale-game.zip`;

    await docker.execCommand(`mkdir -p ${downloadPath}`, 30000, containerName);

    // Prepare channel flag for future use
    // When hytale-downloader supports channels, uncomment this:
    // const channelFlag = channel === 'pre-release' ? '--channel=pre-release' : '';
    const channelFlag = ''; // TODO: Enable when downloader supports it

    const exec = await c.exec({
      Cmd: ['sh', '-c', `cd /opt/hytale && hytale-downloader ${channelFlag} -download-path ${zipPath} 2>&1`],
      AttachStdout: true,
      AttachStderr: true,
      Tty: true
    });

    const stream = await exec.start({ Tty: true });
    let authRequiredDetected = false;
    let authExpiredDetected = false;
    let streamFailureMessage: string | null = null;

    const syncServerState = async (): Promise<void> => {
      if (!serverId) return;
      socket.emit('files', await files.checkServerFiles(serverId, containerName));
      socket.emit('downloader-auth', await files.checkAuth(serverId, containerName));
    };

    const result = await new Promise<DownloadResult>((resolve) => {
      let resolved = false;
      const resolveOnce = (value: DownloadResult): void => {
        if (resolved) return;
        resolved = true;
        resolve(value);
      };

      stream.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf8');
        console.log('Download output:', text);

        if (isAuthExpiredOutput(text)) {
          authExpiredDetected = true;
          streamFailureMessage =
            'Authentication expired. Stored downloader credentials were cleared. Start download again to re-authenticate.';
          socket.emit('download-status', {
            status: 'error',
            message: streamFailureMessage,
            serverId
          });
          return;
        }

        if (isAuthRequiredOutput(text)) {
          authRequiredDetected = true;
          socket.emit('download-status', {
            status: 'auth-required',
            message: text,
            serverId
          });
        } else if (isAuthForbiddenOutput(text)) {
          streamFailureMessage = 'Authentication failed or expired. Try again.';
          socket.emit('download-status', {
            status: 'error',
            message: streamFailureMessage,
            serverId
          });
        } else {
          socket.emit('download-status', {
            status: 'output',
            message: text,
            serverId
          });
        }
      });

      stream.on('end', () => {
        void (async () => {
          try {
            console.log('Download stream ended');

            // Sync filesystem to ensure file is visible
            await docker.execCommand('sync', 30000, containerName);

            const checkZip = await docker.execCommand(
              `ls ${zipPath} 2>/dev/null || echo 'NO_ZIP'`,
              30000,
              containerName
            );

            if (!checkZip.includes('NO_ZIP')) {
              socket.emit('download-status', {
                status: 'extracting',
                message: 'Extracting files...',
                serverId
              });

              await docker.execCommand(
                `unzip -o ${zipPath} -d ${downloadPath}/extract 2>/dev/null || true`,
                60000,
                containerName
              );
              await docker.execCommand(
                `find ${downloadPath}/extract -name 'HytaleServer.jar' -exec cp {} /opt/hytale/ \\; 2>/dev/null || true`,
                30000,
                containerName
              );
              await docker.execCommand(
                `find ${downloadPath}/extract -name 'Assets.zip' -exec cp {} /opt/hytale/ \\; 2>/dev/null || true`,
                30000,
                containerName
              );
              await docker.execCommand(`rm -rf ${downloadPath}`, 30000, containerName);

              await updater.recordDownload(containerName);

              socket.emit('download-status', {
                status: 'complete',
                message: 'Download complete!',
                serverId
              });

              await syncServerState();
              resolveOnce({ success: true });
              return;
            }

            const message =
              streamFailureMessage ||
              (authRequiredDetected
                ? 'Download finished without files. Complete authentication and retry.'
                : 'Download finished without downloading server files.');

            if (authExpiredDetected) {
              try {
                await docker.execCommand('rm -f /opt/hytale/.hytale-downloader-credentials.json', 30000, containerName);
              } catch (clearError) {
                console.warn('Failed to clear stale downloader credentials:', (clearError as Error).message);
              }
            }

            socket.emit('download-status', {
              status: streamFailureMessage ? 'error' : 'done',
              message: streamFailureMessage
                ? message
                : authRequiredDetected
                  ? 'Download finished. Check if authentication was completed.'
                  : 'Download finished without downloading server files.',
              serverId
            });

            await syncServerState();
            resolveOnce({
              success: false,
              code: 'DOWNLOAD_FAILED',
              error: message
            });
          } catch (e) {
            const message = (e as Error).message;
            console.error('Download post-processing error:', e);
            socket.emit('download-status', {
              status: 'error',
              code: 'DOWNLOAD_FAILED',
              message,
              serverId
            });
            resolveOnce({
              success: false,
              code: 'DOWNLOAD_FAILED',
              error: message
            });
          }
        })();
      });

      stream.on('error', (err: Error) => {
        console.error('Download stream error:', err);
        streamFailureMessage = err.message;
        socket.emit('download-status', {
          status: 'error',
          code: 'DOWNLOAD_FAILED',
          message: err.message,
          serverId
        });
        resolveOnce({
          success: false,
          code: 'DOWNLOAD_FAILED',
          error: err.message
        });
      });
    });

    return result;
  } catch (e) {
    console.error('Download error:', e);
    const message = (e as Error).message;
    const isContainerRunningIssue = message.includes('409') || message.toLowerCase().includes('not running');
    const code = isContainerRunningIssue ? 'CONTAINER_NOT_RUNNING' : 'DOWNLOAD_FAILED';

    socket.emit('download-status', {
      status: 'error',
      code,
      message: isContainerRunningIssue ? 'Server is offline. Start it from Control tab and try again.' : message,
      serverId
    });

    return {
      success: false,
      code,
      error: isContainerRunningIssue ? 'Server is offline. Start it from Control tab and try again.' : message
    };
  }
}
