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
}

export interface UpdateCheckResult {
  success: boolean;
  lastUpdate: string | null;
  daysSinceUpdate: number | null;
  hasFiles: boolean;
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
    const filesStatus = await files.checkServerFiles(serverId, containerName);
    const metadata = await getMetadata(containerName);

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
      hasFiles: filesStatus.ready
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
    let channel: 'stable' | 'pre-release' = 'stable';
    if (serverId) {
      const serverResult = await servers.getServer(serverId);
      if (serverResult.success && serverResult.server) {
        channel = serverResult.server.config.releaseChannel || 'stable';
      }
    }

    // Download new files FIRST (requires container running, not server)
    socket.emit('update:status', {
      status: 'downloading',
      message: 'Downloading update...',
      serverId
    });
    await downloader.downloadServerFiles(socket, containerName, serverId, channel);

    // Update metadata
    const jarInfo = await getJarInfo(containerName);
    const metadata: UpdateMetadata = {
      lastDownloadAt: new Date().toISOString(),
      jarSize: jarInfo?.size || null,
      jarHash: jarInfo?.hash || null,
      assetsSize: null // Could be added later
    };
    await saveMetadata(metadata, containerName);

    // Restart server to apply changes if it was running
    if (wasRunning) {
      socket.emit('update:status', {
        status: 'restarting',
        message: 'Restarting server to apply update...',
        serverId
      });
      await docker.restart(containerName);

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

export async function recordDownload(containerName?: string): Promise<void> {
  try {
    const jarInfo = await getJarInfo(containerName);
    const metadata: UpdateMetadata = {
      lastDownloadAt: new Date().toISOString(),
      jarSize: jarInfo?.size || null,
      jarHash: jarInfo?.hash || null,
      assetsSize: null
    };
    await saveMetadata(metadata, containerName);
  } catch {
    // Silently fail - metadata is non-critical
  }
}
