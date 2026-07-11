import type { Socket } from 'socket.io';
import * as docker from './docker.js';
import * as downloader from './downloader.js';
import * as files from './files.js';
import * as servers from './servers.js';

export interface UpdateMetadata {
  lastDownloadAt: string | null;
  jarSize: number | null;
  jarHash: string | null;
  assetsSize: number | null;
  installedVersion?: string | null;
}

export interface UpdateCheckResult {
  success: boolean;
  lastUpdate: string | null;
  daysSinceUpdate: number | null;
  hasFiles: boolean;
  currentVersion?: string | null;
  latestVersion?: string | null;
  updateAvailable?: boolean | null;
  code?: 'CONTAINER_NOT_RUNNING';
  error?: string;
}

export interface UpdateApplyResult {
  success: boolean;
  error?: string;
}

const METADATA_PATH = '/opt/hytale/.update-metadata.json';

async function getMetadata(containerName?: string): Promise<UpdateMetadata | null> {
  try {
    const result = await docker.execCommand(`cat ${METADATA_PATH} 2>/dev/null || echo '{}'`, 30000, containerName);
    const trimmed = result.trim();
    if (!trimmed || trimmed === '{}') return null;
    return JSON.parse(trimmed) as UpdateMetadata;
  } catch {
    return null;
  }
}

async function saveMetadata(metadata: UpdateMetadata, containerName?: string): Promise<void> {
  const json = JSON.stringify(metadata, null, 2);
  const escaped = json.replaceAll("'", String.raw`'\'`);
  await docker.execCommand(`echo '${escaped}' > ${METADATA_PATH}`, 30000, containerName);
}

function patchlineFlag(channel?: servers.ReleaseChannel): string {
  return channel === 'pre-release' ? '-patchline pre-release' : '';
}

// Queries the official downloader for the version currently available on the patchline.
async function getRemoteVersion(containerName?: string, channel?: servers.ReleaseChannel): Promise<string | null> {
  try {
    const output = await docker.execCommand(
      `hytale-downloader -print-version -skip-update-check ${patchlineFlag(channel)} 2>/dev/null | tail -n 1`,
      60000,
      containerName
    );
    const version = output.trim();
    // Versions look like 2026.01.13-50e69c385; reject auth prompts or errors
    if (!version || version.length > 64 || /\s/.test(version)) return null;
    return version;
  } catch {
    return null;
  }
}

async function getServerChannel(serverId?: string): Promise<servers.ReleaseChannel> {
  if (!serverId) return 'stable';
  const result = await servers.getServer(serverId);
  return result.success && result.server ? result.server.config.releaseChannel || 'stable' : 'stable';
}

async function getJarInfo(containerName?: string): Promise<{ size: number; hash: string } | null> {
  try {
    const sizeResult = await docker.execCommand(
      "stat -c '%s' /opt/hytale/HytaleServer.jar 2>/dev/null || echo '0'",
      30000,
      containerName
    );
    const size = Number.parseInt(sizeResult.trim(), 10);
    if (size === 0) return null;

    const hashResult = await docker.execCommand(
      "md5sum /opt/hytale/HytaleServer.jar 2>/dev/null | cut -d' ' -f1",
      30000,
      containerName
    );
    const hash = hashResult.trim();
    if (!hash) return null;

    return { size, hash };
  } catch {
    return null;
  }
}

export async function checkForUpdate(serverId: string, containerName?: string): Promise<UpdateCheckResult> {
  try {
    const status = await docker.getStatus(containerName);
    if (!status.running) {
      return {
        success: false,
        lastUpdate: null,
        daysSinceUpdate: null,
        hasFiles: false,
        code: 'CONTAINER_NOT_RUNNING',
        error: 'Server is offline. Start it from Control tab and try again.'
      };
    }

    const filesStatus = await files.checkServerFiles(serverId, containerName);
    const metadata = await getMetadata(containerName);
    const channel = await getServerChannel(serverId);
    const latestVersion = await getRemoteVersion(containerName, channel);
    const currentVersion = metadata?.installedVersion || null;

    let daysSinceUpdate: number | null = null;
    if (metadata?.lastDownloadAt) {
      const lastDate = new Date(metadata.lastDownloadAt);
      const now = new Date();
      daysSinceUpdate = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      success: true,
      lastUpdate: metadata?.lastDownloadAt || null,
      daysSinceUpdate,
      hasFiles: filesStatus.ready,
      currentVersion,
      latestVersion,
      updateAvailable: latestVersion && currentVersion ? latestVersion !== currentVersion : null
    };
  } catch (e) {
    return {
      success: false,
      lastUpdate: null,
      daysSinceUpdate: null,
      hasFiles: false,
      error: (e as Error).message
    };
  }
}

export async function applyUpdate(
  socket: Socket,
  containerName?: string,
  serverId?: string
): Promise<UpdateApplyResult> {
  try {
    // Check if server is running before update
    const status = await docker.getStatus(containerName);
    const wasRunning = status.running;

    // Get server config to determine release channel
    const channel = await getServerChannel(serverId);

    // Download new files FIRST (requires container running, not server)
    socket.emit('update:status', {
      status: 'downloading',
      message: 'Downloading update...',
      serverId
    });
    const downloadResult = await downloader.downloadServerFiles(socket, containerName, serverId, channel);
    if (!downloadResult.success) {
      throw new Error(downloadResult.error || 'Server update download failed');
    }

    // Metadata is recorded by the downloader on success (recordDownload)

    // Restart server to apply changes if it was running
    if (wasRunning) {
      socket.emit('update:status', {
        status: 'restarting',
        message: 'Restarting server to apply update...',
        serverId
      });
      const restartResult = await docker.restart(containerName);
      if (!restartResult.success) {
        throw new Error(restartResult.error || 'Failed to restart server after update');
      }

      // Wait for restart to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    socket.emit('update:status', {
      status: 'complete',
      message: 'Update complete!',
      serverId
    });
    return { success: true };
  } catch (e) {
    socket.emit('update:status', {
      status: 'error',
      message: (e as Error).message,
      serverId
    });
    return { success: false, error: (e as Error).message };
  }
}

export async function recordDownload(containerName?: string, channel?: servers.ReleaseChannel): Promise<void> {
  try {
    const jarInfo = await getJarInfo(containerName);
    // Right after a successful download, the remote version IS the installed version
    const installedVersion = await getRemoteVersion(containerName, channel);
    const metadata: UpdateMetadata = {
      lastDownloadAt: new Date().toISOString(),
      jarSize: jarInfo?.size || null,
      jarHash: jarInfo?.hash || null,
      assetsSize: null,
      installedVersion
    };
    await saveMetadata(metadata, containerName);
  } catch {
    // Silently fail - metadata is non-critical
  }
}
