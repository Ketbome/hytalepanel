import type { Server, Socket } from 'socket.io';
import * as backups from '../services/backups.js';
import * as curseforge from '../services/curseforge.js';
import * as docker from '../services/docker.js';
import * as downloader from '../services/downloader.js';
import * as files from '../services/files.js';
import * as mods from '../services/mods.js';
import * as modtale from '../services/modtale.js';
import * as servers from '../services/servers.js';
import * as updater from '../services/updater.js';

interface LogsMoreParams {
  currentCount?: number;
  batchSize?: number;
}

interface SaveParams {
  path: string;
  content: string;
  createBackup?: boolean;
}

interface RenameParams {
  oldPath: string;
  newPath: string;
}

interface InstallParams {
  projectId: string;
  versionId: string;
  metadata: {
    versionName: string;
    projectTitle: string;
    classification?: string;
    fileName?: string;
    projectIconUrl?: string | null;
    projectSlug?: string | null;
  };
}

interface CFInstallParams {
  modId: string;
  fileId: string;
  metadata: {
    versionName: string;
    projectTitle: string;
    classification?: string;
    fileName?: string;
    projectIconUrl?: string | null;
    projectSlug?: string | null;
  };
}

interface UpdateParams {
  modId: string;
  versionId: string;
  metadata: {
    versionName: string;
    fileName?: string;
  };
}

interface ServerContext {
  serverId: string | null;
  containerName: string | null;
}

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected');

    // Server context for this socket
    const ctx: ServerContext = {
      serverId: null,
      containerName: null
    };

    let logStream: NodeJS.ReadableStream | null = null;
    const emitBackupStatus = (status: 'idle' | 'creating' | 'restoring' | 'error', error?: string): void => {
      socket.emit('backup:status', { status, error });
    };

    const getSafeBackupConfig = (rawConfig: Partial<backups.BackupConfig> | undefined): backups.BackupConfig => {
      const normalized = backups.normalizeBackupConfig(rawConfig);
      if (normalized.success && normalized.config) {
        return normalized.config;
      }

      console.warn(`[Backups] Invalid backup config detected, using defaults: ${normalized.error}`);
      return backups.DEFAULT_BACKUP_CONFIG;
    };

    async function connectLogStream(tail = 0): Promise<void> {
      if (logStream) {
        try {
          (logStream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
        } catch {
          /* ignore */
        }
        logStream = null;
      }

      if (!ctx.containerName) return;

      try {
        logStream = await docker.getLogs({
          tail,
          containerName: ctx.containerName
        });

        logStream.on('data', (chunk: Buffer) => {
          socket.emit('log', chunk.subarray(8).toString('utf8'));
        });

        logStream.on('error', () => {
          logStream = null;
        });
        logStream.on('end', () => {
          logStream = null;
        });
      } catch (e) {
        socket.emit('error', `Failed to connect to container logs: ${(e as Error).message}`);
      }
    }

    // Join a server room and set context
    socket.on('server:join', async (serverId: string) => {
      // Leave previous room and cleanup
      if (ctx.serverId) {
        socket.leave(`server:${ctx.serverId}`);
        if (logStream) {
          try {
            (logStream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
          } catch {
            /* ignore */
          }
          logStream = null;
        }
      }

      const result = await servers.getServer(serverId);
      if (!result.success || !result.server) {
        socket.emit('server:join-error', { error: 'Server not found' });
        return;
      }

      ctx.serverId = serverId;
      ctx.containerName = result.server.containerName;
      socket.join(`server:${serverId}`);

      // Check if server is running first
      const status = await docker.getStatus(ctx.containerName);
      socket.emit('status', status);

      // Files status (with Docker exec fallback for TrueNAS/custom setups)
      socket.emit('files', await files.checkServerFiles(serverId, ctx.containerName));
      socket.emit('downloader-auth', await files.checkAuth(serverId, ctx.containerName));

      // Logs only available when container is running
      if (status.running) {
        try {
          const history = await docker.getLogsHistory(500, ctx.containerName);
          socket.emit('logs:history', { logs: history, initial: true });
        } catch (e) {
          console.error('Failed to get log history:', (e as Error).message);
        }
        await connectLogStream();
      } else {
        socket.emit('logs:history', { logs: [], initial: true });
      }

      socket.emit('server:joined', { serverId, server: result.server });
    });

    socket.on('server:leave', () => {
      if (ctx.serverId) {
        socket.leave(`server:${ctx.serverId}`);
      }
      ctx.serverId = null;
      ctx.containerName = null;

      if (logStream) {
        try {
          (logStream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
        } catch {
          /* ignore */
        }
        logStream = null;
      }
    });

    socket.on('command', async (cmd: string) => {
      if (!ctx.containerName) {
        socket.emit('command-result', {
          cmd,
          success: false,
          error: 'No server selected'
        });
        return;
      }
      const result = await docker.sendCommand(cmd, ctx.containerName);
      socket.emit('command-result', { cmd, ...result });
    });

    socket.on('download', async () => {
      if (!ctx.containerName || !ctx.serverId) return;

      // Get server config to determine release channel
      const serverResult = await servers.getServer(ctx.serverId);
      const channel = serverResult.server?.config.releaseChannel || 'stable';

      await downloader.downloadServerFiles(socket, ctx.containerName, ctx.serverId, channel);
    });

    socket.on('restart', async () => {
      if (!ctx.containerName) return;
      socket.emit('action-status', { action: 'restart', status: 'starting' });
      const result = await docker.restart(ctx.containerName);
      socket.emit('action-status', { action: 'restart', ...result });

      if (result.success) {
        setTimeout(async () => {
          await connectLogStream(50);
          socket.emit('status', await docker.getStatus(ctx.containerName!));
        }, 2000);
      }
    });

    socket.on('stop', async () => {
      if (!ctx.containerName) return;
      console.log('[Socket] Stop requested');

      // Stop backup scheduler
      if (ctx.serverId) {
        backups.stopBackupScheduler(ctx.serverId);
      }

      socket.emit('action-status', { action: 'stop', status: 'starting' });
      const result = await docker.stop(ctx.containerName);
      console.log('[Socket] Stop result:', result);
      socket.emit('action-status', { action: 'stop', ...result });

      // Emit updated status so UI knows server is stopped
      if (result.success) {
        setTimeout(async () => {
          socket.emit('status', await docker.getStatus(ctx.containerName!));
        }, 500);
      }
    });

    socket.on('kill', async () => {
      if (!ctx.containerName) return;
      console.log('[Socket] Kill (force stop) requested');

      // Stop backup scheduler
      if (ctx.serverId) {
        backups.stopBackupScheduler(ctx.serverId);
      }

      socket.emit('action-status', { action: 'kill', status: 'starting' });
      const result = await docker.kill(ctx.containerName);
      console.log('[Socket] Kill result:', result);
      socket.emit('action-status', { action: 'kill', ...result });

      // Emit updated status so UI knows server is stopped
      if (result.success) {
        setTimeout(async () => {
          socket.emit('status', await docker.getStatus(ctx.containerName!));
        }, 500);
      }
    });

    socket.on('start', async () => {
      if (!ctx.serverId) return;
      console.log('[Socket] Start requested');

      // Get server config for backup settings
      const serverResult = await servers.getServer(ctx.serverId);
      const backupConfig = getSafeBackupConfig(serverResult.server?.config.backup);

      // Create backup on start if enabled
      if (backupConfig.onServerStart) {
        console.log('[Socket] Creating backup before start');
        emitBackupStatus('creating');
        const backupResult = await backups.createBackup(ctx.serverId);
        if (backupResult.success) {
          console.log(`[Socket] Backup created: ${backupResult.backup?.filename}`);
          await backups.cleanupOldBackups(ctx.serverId, backupConfig);
          emitBackupStatus('idle');
        } else {
          emitBackupStatus('error', backupResult.error);
          emitBackupStatus('idle');
        }
      }

      socket.emit('action-status', { action: 'start', status: 'starting' });

      // Use docker-compose up for the server
      const result = await servers.startServer(ctx.serverId);
      console.log('[Socket] Start result:', result);
      socket.emit('action-status', { action: 'start', ...result });

      if (result.success && ctx.containerName && ctx.serverId) {
        // Start backup scheduler if enabled
        if (backupConfig.enabled && backupConfig.intervalMinutes > 0) {
          backups.startBackupScheduler(ctx.serverId, backupConfig);
        }

        setTimeout(async () => {
          await connectLogStream(50);
          const status = await docker.getStatus(ctx.containerName!);
          socket.emit('status', status);
          socket.emit('files', await files.checkServerFiles(ctx.serverId!, ctx.containerName ?? undefined));
          socket.emit('downloader-auth', await files.checkAuth(ctx.serverId!, ctx.containerName ?? undefined));
        }, 2000);
      }
    });

    socket.on('check-files', async () => {
      if (!ctx.serverId) return;
      socket.emit('files', await files.checkServerFiles(ctx.serverId, ctx.containerName ?? undefined));
      socket.emit('downloader-auth', await files.checkAuth(ctx.serverId, ctx.containerName ?? undefined));
    });

    socket.on('logs:more', async ({ currentCount = 0, batchSize = 200 }: LogsMoreParams) => {
      if (!ctx.containerName) return;
      try {
        const total = currentCount + batchSize;
        const allLogs = await docker.getLogsHistory(total, ctx.containerName);

        const olderLogs = allLogs.slice(0, Math.max(0, allLogs.length - currentCount));

        socket.emit('logs:history', {
          logs: olderLogs,
          initial: false,
          hasMore: allLogs.length >= total
        });
      } catch (e) {
        socket.emit('logs:history', {
          logs: [],
          error: (e as Error).message
        });
      }
    });

    socket.on('wipe', async () => {
      if (!ctx.serverId) return;
      socket.emit('action-status', { action: 'wipe', status: 'starting' });
      const result = await files.wipeData(ctx.serverId);
      socket.emit('action-status', { action: 'wipe', ...result });
      socket.emit('downloader-auth', await files.checkAuth(ctx.serverId, ctx.containerName ?? undefined));
    });

    socket.on('files:list', async (dirPath = '/') => {
      if (!ctx.serverId) return;
      socket.emit('files:list-result', await files.listDirectory(dirPath, ctx.serverId));
    });

    socket.on('files:read', async (filePath: string) => {
      if (!ctx.serverId) return;
      socket.emit('files:read-result', await files.readContent(filePath, ctx.serverId));
    });

    socket.on('files:save', async ({ path: filePath, content, createBackup: shouldBackup }: SaveParams) => {
      if (!ctx.serverId) return;
      let backupResult = null;
      if (shouldBackup) {
        backupResult = await files.createBackup(filePath, ctx.serverId);
      }
      const result = await files.writeContent(filePath, content, ctx.serverId);
      socket.emit('files:save-result', { ...result, backup: backupResult });
    });

    socket.on('files:mkdir', async (dirPath: string) => {
      if (!ctx.serverId) return;
      socket.emit('files:mkdir-result', await files.createDirectory(dirPath, ctx.serverId));
    });

    socket.on('files:delete', async (itemPath: string) => {
      if (!ctx.serverId) return;
      socket.emit('files:delete-result', await files.deleteItem(itemPath, ctx.serverId));
    });

    socket.on('files:rename', async ({ oldPath, newPath }: RenameParams) => {
      if (!ctx.serverId) return;
      socket.emit('files:rename-result', await files.renameItem(oldPath, newPath, ctx.serverId));
    });

    socket.on('files:copy', async ({ srcPath, destPath }: { srcPath: string; destPath: string }) => {
      if (!ctx.serverId) return;
      const result = await files.copyItem(srcPath, destPath, ctx.serverId);
      socket.emit('files:copy-result', result);
    });

    socket.on('mods:list', async () => {
      if (!ctx.containerName) return;
      const result = await mods.listInstalledMods(ctx.containerName);

      if (result.success && modtale.isConfigured()) {
        const localMods = result.mods.filter((m) => m.isLocal && !m.projectId);

        if (localMods.length > 0) {
          const enrichPromises = localMods.map(async (mod) => {
            try {
              const searchTerm = mod.fileName
                .replace(/\.(jar|zip|disabled)$/gi, '')
                .replace(/-[\d.]+.*$/, '')
                .replaceAll(/[-_]/g, ' ');

              if (!searchTerm || searchTerm.length < 2) return;

              const searchResult = await modtale.searchProjects({
                query: searchTerm,
                pageSize: 5
              });
              if (!searchResult.success || !searchResult.projects.length) return;

              const match = searchResult.projects.find(
                (p) =>
                  p.title.toLowerCase() === searchTerm.toLowerCase() ||
                  p.title.toLowerCase().includes(searchTerm.toLowerCase())
              );

              if (match) {
                const updates: Partial<mods.InstalledMod> = {
                  providerId: 'modtale',
                  projectId: match.id,
                  projectSlug: match.slug,
                  projectTitle: match.title,
                  projectIconUrl: match.iconUrl,
                  classification: match.classification,
                  isLocal: false
                };

                const versionMatch = mod.fileName.match(/-(\d+\.\d+(?:\.\d+)?)/);
                if (versionMatch) {
                  const fileVersion = versionMatch[1];
                  const matchingVersion = match.versions?.find((v) => v.version === fileVersion);
                  if (matchingVersion) {
                    updates.versionId = matchingVersion.id;
                    updates.versionName = matchingVersion.version;
                  } else {
                    updates.versionName = fileVersion;
                  }
                }

                Object.assign(mod, updates);
                await mods.updateMod(mod.id, updates, ctx.containerName!);
              }
            } catch (e) {
              console.error(`[Mods] Error enriching mod ${mod.fileName}:`, (e as Error).message);
            }
          });

          await Promise.all(enrichPromises);
        }
      }

      socket.emit('mods:list-result', result);
    });

    socket.on('mods:search', async (params: modtale.SearchParams) => {
      socket.emit('mods:search-result', await modtale.searchProjects(params));
    });

    socket.on('mods:get', async (projectId: string) => {
      socket.emit('mods:get-result', await modtale.getProject(projectId));
    });

    socket.on('mods:install', async ({ projectId, versionId, metadata }: InstallParams) => {
      if (!ctx.containerName) return;
      socket.emit('mods:install-status', {
        status: 'downloading',
        projectId
      });

      const downloadResult = await modtale.downloadVersion(projectId, metadata.versionName);
      if (!downloadResult.success || !downloadResult.buffer) {
        socket.emit('mods:install-result', {
          success: false,
          error: downloadResult.error
        });
        return;
      }

      socket.emit('mods:install-status', { status: 'installing', projectId });

      let fileName = downloadResult.fileName || metadata.fileName;
      if (!fileName) {
        const ext = metadata.classification === 'MODPACK' ? 'zip' : 'jar';
        fileName = `${metadata.projectTitle.replaceAll(/[^a-zA-Z0-9]/g, '-')}-${metadata.versionName}.${ext}`;
      }

      const installResult = await mods.installMod(
        downloadResult.buffer,
        {
          ...metadata,
          projectId,
          versionId,
          fileName
        },
        ctx.containerName
      );

      socket.emit('mods:install-result', installResult);
    });

    socket.on('mods:uninstall', async (modId: string) => {
      if (!ctx.containerName) return;
      socket.emit('mods:uninstall-result', await mods.uninstallMod(modId, ctx.containerName));
    });

    socket.on('mods:enable', async (modId: string) => {
      if (!ctx.containerName) return;
      socket.emit('mods:enable-result', await mods.enableMod(modId, ctx.containerName));
    });

    socket.on('mods:disable', async (modId: string) => {
      if (!ctx.containerName) return;
      socket.emit('mods:disable-result', await mods.disableMod(modId, ctx.containerName));
    });

    socket.on('mods:check-config', async () => {
      const result = await modtale.verifyApiKey();
      socket.emit('mods:config-status', result);
    });

    socket.on('mods:classifications', async () => {
      socket.emit('mods:classifications-result', await modtale.getClassifications());
    });

    // CurseForge handlers
    socket.on('cf:check-config', async () => {
      const result = await curseforge.verifyApiKey();
      socket.emit('cf:config-status', result);
    });

    socket.on('cf:search', async (params: curseforge.SearchParams) => {
      socket.emit('cf:search-result', await curseforge.searchProjects(params));
    });

    socket.on('cf:get', async (modId: string) => {
      socket.emit('cf:get-result', await curseforge.getProject(modId));
    });

    socket.on('cf:categories', async () => {
      socket.emit('cf:categories-result', await curseforge.getCategories());
    });

    socket.on('cf:files', async (modId: string) => {
      socket.emit('cf:files-result', await curseforge.getModFiles(modId));
    });

    socket.on('cf:install', async ({ modId, fileId, metadata }: CFInstallParams) => {
      if (!ctx.containerName) return;
      socket.emit('cf:install-status', { status: 'downloading', modId });

      const downloadResult = await curseforge.downloadVersion(modId, fileId);
      if (!downloadResult.success || !downloadResult.buffer) {
        socket.emit('cf:install-result', {
          success: false,
          error: downloadResult.error
        });
        return;
      }

      socket.emit('cf:install-status', { status: 'installing', modId });

      let fileName = downloadResult.fileName || metadata.fileName;
      if (!fileName) {
        const ext = metadata.classification === 'PACK' ? 'zip' : 'jar';
        fileName = `${metadata.projectTitle.replaceAll(/[^a-zA-Z0-9]/g, '-')}-${metadata.versionName}.${ext}`;
      }

      const installResult = await mods.installMod(
        downloadResult.buffer,
        {
          providerId: 'curseforge',
          projectId: modId,
          versionId: fileId,
          versionName: metadata.versionName,
          projectTitle: metadata.projectTitle,
          classification: metadata.classification,
          fileName,
          projectIconUrl: metadata.projectIconUrl,
          projectSlug: metadata.projectSlug
        },
        ctx.containerName
      );

      socket.emit('cf:install-result', installResult);
    });

    // Server update handlers
    socket.on('update:check', async () => {
      if (!ctx.serverId) return;
      socket.emit('update:check-result', await updater.checkForUpdate(ctx.serverId, ctx.containerName ?? undefined));
    });

    socket.on('update:apply', async () => {
      if (!ctx.containerName || !ctx.serverId) return;
      await updater.applyUpdate(socket, ctx.containerName, ctx.serverId);
    });

    socket.on('mods:check-updates', async () => {
      if (!ctx.containerName) return;
      try {
        const listResult = await mods.listInstalledMods(ctx.containerName);
        if (!listResult.success) {
          socket.emit('mods:check-updates-result', {
            success: false,
            error: listResult.error
          });
          return;
        }

        const allUpdates: Array<{
          modId: string;
          projectId: string | null;
          projectTitle: string;
          currentVersion: string;
          latestVersion: string;
          latestVersionId: string;
          latestFileName?: string;
          providerId: string;
        }> = [];

        // Check Modtale mods if API is configured
        if (modtale.isConfigured()) {
          const modtaleMods = listResult.mods.filter((m) => m.providerId === 'modtale' && m.projectId);

          const modtaleChecks = await Promise.all(
            modtaleMods.map(async (mod) => {
              try {
                const projectResult = await modtale.getProject(mod.projectId!);
                if (projectResult.success && projectResult.project?.latestVersion) {
                  const latest = projectResult.project.latestVersion;
                  if (latest.id && latest.id !== mod.versionId) {
                    return {
                      modId: mod.id,
                      projectId: mod.projectId,
                      projectTitle: mod.projectTitle,
                      currentVersion: mod.versionName,
                      latestVersion: latest.version,
                      latestVersionId: latest.id,
                      latestFileName: latest.fileName,
                      providerId: 'modtale'
                    };
                  }
                }
              } catch (e) {
                console.error(`[Mods] Error checking Modtale updates for ${mod.projectTitle}:`, (e as Error).message);
              }
              return null;
            })
          );
          allUpdates.push(...(modtaleChecks.filter(Boolean) as typeof allUpdates));
        }

        // Check CurseForge mods if API is configured
        if (curseforge.isConfigured()) {
          const cfMods = listResult.mods.filter((m) => m.providerId === 'curseforge' && m.projectId);

          const cfChecks = await Promise.all(
            cfMods.map(async (mod) => {
              try {
                const projectResult = await curseforge.getProject(mod.projectId!);
                if (projectResult.success && projectResult.project?.latestVersion) {
                  const latest = projectResult.project.latestVersion;
                  if (latest.id && latest.id !== mod.versionId) {
                    return {
                      modId: mod.id,
                      projectId: mod.projectId,
                      projectTitle: mod.projectTitle,
                      currentVersion: mod.versionName,
                      latestVersion: latest.version,
                      latestVersionId: latest.id,
                      latestFileName: latest.fileName,
                      providerId: 'curseforge'
                    };
                  }
                }
              } catch (e) {
                console.error(
                  `[Mods] Error checking CurseForge updates for ${mod.projectTitle}:`,
                  (e as Error).message
                );
              }
              return null;
            })
          );
          allUpdates.push(...(cfChecks.filter(Boolean) as typeof allUpdates));
        }

        socket.emit('mods:check-updates-result', {
          success: true,
          updates: allUpdates
        });
      } catch (e) {
        socket.emit('mods:check-updates-result', {
          success: false,
          error: (e as Error).message
        });
      }
    });

    socket.on('mods:update', async ({ modId, versionId, metadata }: UpdateParams) => {
      if (!ctx.containerName) return;
      console.log(`[Mods] Update request: modId=${modId}, versionId=${versionId}`);

      const modResult = await mods.getMod(modId, ctx.containerName);
      if (!modResult.success || !modResult.mod) {
        socket.emit('mods:update-result', {
          success: false,
          error: 'Mod not found'
        });
        return;
      }

      const mod = modResult.mod;
      socket.emit('mods:update-status', { status: 'downloading', modId });

      let downloadResult: {
        success: boolean;
        buffer?: Buffer;
        fileName?: string | null;
        error?: string;
      };

      if (mod.providerId === 'curseforge') {
        downloadResult = await curseforge.downloadVersion(mod.projectId!, versionId);
      } else {
        downloadResult = await modtale.downloadVersion(mod.projectId!, metadata.versionName);
      }

      if (!downloadResult.success || !downloadResult.buffer) {
        socket.emit('mods:update-result', {
          success: false,
          error: downloadResult.error
        });
        return;
      }

      socket.emit('mods:update-status', { status: 'installing', modId });

      const installResult = await mods.installMod(
        downloadResult.buffer,
        {
          providerId: mod.providerId,
          projectId: mod.projectId || undefined,
          projectSlug: mod.projectSlug,
          projectTitle: mod.projectTitle,
          projectIconUrl: mod.projectIconUrl,
          versionId: versionId,
          versionName: metadata.versionName,
          classification: mod.classification,
          fileName: downloadResult.fileName || metadata.fileName
        },
        ctx.containerName
      );

      if (installResult.success) {
        socket.emit('mods:update-result', {
          success: true,
          mod: installResult.mod
        });
      } else {
        socket.emit('mods:update-result', {
          success: false,
          error: installResult.error
        });
      }
    });

    // Backup handlers
    socket.on('backup:create', async () => {
      if (!ctx.serverId) return;
      emitBackupStatus('creating');
      const result = await backups.createBackup(ctx.serverId);
      socket.emit('backup:create-result', result);
      if (result.success) {
        // Cleanup old backups after creating new one
        const serverResult = await servers.getServer(ctx.serverId);
        const backupConfig = getSafeBackupConfig(serverResult.server?.config.backup);
        await backups.cleanupOldBackups(ctx.serverId, backupConfig);
        emitBackupStatus('idle');
      } else {
        emitBackupStatus('error', result.error);
        emitBackupStatus('idle');
      }
    });

    socket.on('backup:list', async () => {
      if (!ctx.serverId) return;
      socket.emit('backup:list-result', await backups.listBackups(ctx.serverId));
    });

    socket.on('backup:restore', async (backupId: string) => {
      if (!ctx.serverId || !ctx.containerName) return;

      // Check if server is running
      const status = await docker.getStatus(ctx.containerName);
      if (status.running) {
        socket.emit('backup:restore-result', {
          success: false,
          error: 'Server must be stopped before restoring backup'
        });
        emitBackupStatus('error', 'Server must be stopped before restoring backup');
        emitBackupStatus('idle');
        return;
      }

      emitBackupStatus('restoring');
      const result = await backups.restoreBackup(ctx.serverId, backupId);
      socket.emit('backup:restore-result', result);
      if (result.success) {
        emitBackupStatus('idle');
      } else {
        emitBackupStatus('error', result.error);
        emitBackupStatus('idle');
      }
    });

    socket.on('backup:delete', async (backupId: string) => {
      if (!ctx.serverId) return;
      const result = await backups.deleteBackup(ctx.serverId, backupId);
      socket.emit('backup:delete-result', result);
    });

    socket.on('backup:config', async (newConfig?: backups.BackupConfig) => {
      if (!ctx.serverId) return;

      if (newConfig) {
        const normalized = backups.normalizeBackupConfig(newConfig);
        if (!normalized.success || !normalized.config) {
          socket.emit('backup:config-result', {
            success: false,
            error: normalized.error
          });
          return;
        }

        // Update backup config
        const result = await servers.updateServer(ctx.serverId, {
          config: { backup: normalized.config }
        });
        if (result.success && result.server) {
          // Restart scheduler if needed
          if (normalized.config.enabled && normalized.config.intervalMinutes > 0) {
            backups.startBackupScheduler(ctx.serverId, normalized.config);
          } else {
            backups.stopBackupScheduler(ctx.serverId);
          }
          socket.emit('backup:config-result', {
            success: true,
            config: normalized.config
          });
        } else {
          socket.emit('backup:config-result', {
            success: false,
            error: result.error
          });
        }
      } else {
        // Get current backup config
        const serverResult = await servers.getServer(ctx.serverId);
        if (serverResult.success && serverResult.server) {
          const normalized = backups.normalizeBackupConfig(serverResult.server.config.backup);
          const configToSend = normalized.success && normalized.config ? normalized.config : backups.DEFAULT_BACKUP_CONFIG;
          socket.emit('backup:config-result', {
            success: true,
            config: configToSend
          });
        } else {
          socket.emit('backup:config-result', {
            success: false,
            error: 'Server not found'
          });
        }
      }
    });

    // Status interval - only when joined to a server
    const statusInterval = setInterval(async () => {
      if (ctx.containerName) {
        socket.emit('status', await docker.getStatus(ctx.containerName));
      }
    }, 5000);

    socket.on('disconnect', () => {
      clearInterval(statusInterval);
      if (logStream) {
        try {
          (logStream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
        } catch {
          /* ignore */
        }
      }
      console.log('Client disconnected');
    });
  });
}
