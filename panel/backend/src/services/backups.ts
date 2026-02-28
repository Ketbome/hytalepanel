import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';
import Extract from 'extract-zip';
import config from '../config/index.js';

// Dynamic path functions for testability
const getDataPath = () => config.data.path;
const getServersDir = () => path.join(getDataPath(), 'servers');

export interface BackupConfig {
  enabled: boolean;
  intervalMinutes: number; // 0 = disabled
  maxBackups: number; // Max backups to keep (0 = unlimited)
  maxAgeDays: number; // Delete backups older than X days (0 = unlimited)
  onServerStart: boolean; // Create backup when server starts
}

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  enabled: false,
  intervalMinutes: 60,
  maxBackups: 10,
  maxAgeDays: 7,
  onServerStart: true
};

export interface BackupInfo {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
}

export interface BackupResult {
  success: boolean;
  backup?: BackupInfo;
  error?: string;
}

export interface BackupListResult {
  success: boolean;
  backups: BackupInfo[];
  error?: string;
}

export interface OperationResult {
  success: boolean;
  error?: string;
}

export interface BackupConfigValidationResult {
  success: boolean;
  config?: BackupConfig;
  error?: string;
}

// Active schedulers map
const activeSchedulers = new Map<string, NodeJS.Timeout>();
const activeBackupOperations = new Set<string>();

function getBackupsDir(serverId: string): string {
  return path.join(getServersDir(), serverId, 'backups');
}

function getServerDataDir(serverId: string): string {
  return path.join(getServersDir(), serverId, 'server');
}

function normalizeNonNegativeInteger(value: unknown, fieldName: string): { value?: number; error?: string } {
  if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(value)) {
    return { error: `${fieldName} must be a number` };
  }
  if (!Number.isInteger(value)) {
    return { error: `${fieldName} must be an integer` };
  }
  if (value < 0) {
    return { error: `${fieldName} must be >= 0` };
  }
  return { value };
}

export function normalizeBackupConfig(
  input: Partial<BackupConfig> | undefined,
  base: BackupConfig = DEFAULT_BACKUP_CONFIG
): BackupConfigValidationResult {
  const candidate: Partial<BackupConfig> = {
    ...base,
    ...(input || {})
  };

  if (typeof candidate.enabled !== 'boolean') {
    return { success: false, error: 'enabled must be a boolean' };
  }
  if (typeof candidate.onServerStart !== 'boolean') {
    return { success: false, error: 'onServerStart must be a boolean' };
  }

  const intervalValidation = normalizeNonNegativeInteger(candidate.intervalMinutes, 'intervalMinutes');
  if (intervalValidation.error) {
    return { success: false, error: intervalValidation.error };
  }

  const maxBackupsValidation = normalizeNonNegativeInteger(candidate.maxBackups, 'maxBackups');
  if (maxBackupsValidation.error) {
    return { success: false, error: maxBackupsValidation.error };
  }

  const maxAgeValidation = normalizeNonNegativeInteger(candidate.maxAgeDays, 'maxAgeDays');
  if (maxAgeValidation.error) {
    return { success: false, error: maxAgeValidation.error };
  }

  const intervalMinutes = intervalValidation.value ?? base.intervalMinutes;
  if (candidate.enabled && intervalMinutes < 1) {
    return { success: false, error: 'intervalMinutes must be >= 1 when automatic backups are enabled' };
  }

  const config: BackupConfig = {
    enabled: candidate.enabled,
    intervalMinutes: candidate.enabled ? intervalMinutes : 0,
    maxBackups: maxBackupsValidation.value ?? base.maxBackups,
    maxAgeDays: maxAgeValidation.value ?? base.maxAgeDays,
    onServerStart: candidate.onServerStart
  };

  return { success: true, config };
}

function generateBackupFilename(): string {
  const now = new Date();
  const iso = now.toISOString();
  const base = iso.slice(0, 19).replaceAll(':', '-');
  const ms = iso.slice(20, 23);
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `backup-${base}-${ms}-${randomSuffix}.zip`;
}

function parseBackupFilename(filename: string): { id: string; createdAt: string } | null {
  const withMsAndSuffix = filename.match(
    /^backup-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})-([a-z0-9]{6})\.zip$/i
  );
  if (withMsAndSuffix) {
    const [, y, mo, d, h, mi, s, ms, suffix] = withMsAndSuffix;
    const isoUtc = `${y}-${mo}-${d}T${h}:${mi}:${s}.${ms}Z`;
    return {
      id: `${y}-${mo}-${d}T${h}-${mi}-${s}-${ms}-${suffix}`,
      createdAt: new Date(isoUtc).toISOString()
    };
  }

  const legacy = filename.match(/^backup-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})\.zip$/);
  if (!legacy) return null;

  const [, y, mo, d, h, mi, s] = legacy;
  const isoUtc = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  return {
    id: `${y}-${mo}-${d}T${h}-${mi}-${s}`,
    createdAt: new Date(isoUtc).toISOString()
  };
}

function isValidBackupId(backupId: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(backupId) ||
    /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}-[a-z0-9]{6}$/i.test(backupId)
  );
}

function getBackupPathFromId(serverId: string, backupId: string): string | null {
  if (!isValidBackupId(backupId)) return null;
  return path.join(getBackupsDir(serverId), `backup-${backupId}.zip`);
}

function hasAllowedBackupContent(entries: string[]): boolean {
  const foldersToRestore = ['universe', 'config', 'mods', 'logs'];
  const rootConfigPattern = /\.(json|ya?ml|properties)$/i;
  return entries.some((entry) => {
    const normalized = entry.replaceAll('\\', '/');
    if (!normalized) return false;
    const topLevel = normalized.split('/')[0];
    if (foldersToRestore.includes(topLevel)) return true;
    if (!normalized.includes('/') && rootConfigPattern.test(normalized)) return true;
    return false;
  });
}

function normalizePathForZipEntry(entry: string): string {
  return entry.replaceAll('\\', '/').replace(/^\/+/, '');
}

async function listTopLevelEntries(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { recursive: true });
  return entries.map((entry) => normalizePathForZipEntry(String(entry)));
}

async function replaceDirectory(targetDir: string, sourceDir: string, rollbackRoot: string): Promise<void> {
  const rollbackTarget = path.join(rollbackRoot, path.basename(targetDir));
  const targetExists = await fs
    .access(targetDir)
    .then(() => true)
    .catch(() => false);

  if (targetExists) {
    await fs.mkdir(rollbackRoot, { recursive: true });
    await fs.rename(targetDir, rollbackTarget);
  }

  const sourceExists = await fs
    .access(sourceDir)
    .then(() => true)
    .catch(() => false);

  if (sourceExists) {
    await fs.rename(sourceDir, targetDir);
  }
}

export async function createBackup(serverId: string): Promise<BackupResult> {
  if (activeBackupOperations.has(serverId)) {
    return { success: false, error: 'backup already in progress' };
  }

  activeBackupOperations.add(serverId);
  try {
    const backupsDir = getBackupsDir(serverId);
    const serverDir = getServerDataDir(serverId);

    // Ensure backups directory exists
    await fs.mkdir(backupsDir, { recursive: true });

    // Check if server directory exists
    try {
      await fs.access(serverDir);
    } catch {
      return { success: false, error: 'Server data directory not found' };
    }

    const filename = generateBackupFilename();
    const backupPath = path.join(backupsDir, filename);
    const tempFilename = `${filename}.tmp`;
    const tempPath = path.join(backupsDir, tempFilename);

    // Create ZIP archive atomically: write to temp file then rename
    console.log(`[Backups] Creating backup (temp): ${tempPath}`);
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(tempPath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);

      // Add folders to backup: universe, config, mods, logs
      const foldersToBackup = ['universe', 'config', 'mods', 'logs'];
      for (const folder of foldersToBackup) {
        const folderPath = path.join(serverDir, folder);
        archive.directory(folderPath, folder);
      }

      // Also backup root config files
      archive.glob('*.json', { cwd: serverDir });
      archive.glob('*.yaml', { cwd: serverDir });
      archive.glob('*.yml', { cwd: serverDir });
      archive.glob('*.properties', { cwd: serverDir });

      archive.finalize();
    });

    // Move temp file to final name atomically
    try {
      await fs.rename(tempPath, backupPath);
      console.log(`[Backups] Backup created: ${backupPath}`);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      console.warn(`[Backups] Rename failed (${err.code}) for ${tempPath} -> ${backupPath}, attempting copy fallback`);
      // Attempt cross-device or permission-safe fallback: copy then unlink temp
      try {
        await fs.copyFile(tempPath, backupPath);
        await fs.unlink(tempPath);
        console.log(`[Backups] Backup created via copy fallback: ${backupPath}`);
      } catch (error_) {
        // Cleanup temp file if copy/unlink fails
        try {
          await fs.unlink(tempPath);
        } catch {
          /* ignore */
        }
        throw error_;
      }
    }

    // Get backup info
    const stats = await fs.stat(backupPath);
    const parsed = parseBackupFilename(filename);

    const backup: BackupInfo = {
      id: parsed?.id || filename,
      filename,
      createdAt: new Date().toISOString(),
      size: stats.size
    };

    return { success: true, backup };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  } finally {
    activeBackupOperations.delete(serverId);
  }
}

export async function listBackups(serverId: string): Promise<BackupListResult> {
  try {
    const backupsDir = getBackupsDir(serverId);

    // Ensure directory exists
    try {
      await fs.access(backupsDir);
    } catch {
      return { success: true, backups: [] };
    }

    const files = await fs.readdir(backupsDir);
    const backups: BackupInfo[] = [];

    for (const file of files) {
      if (!file.endsWith('.zip')) continue;

      const filePath = path.join(backupsDir, file);
      const stats = await fs.stat(filePath);
      const parsed = parseBackupFilename(file);

      if (parsed) {
        backups.push({
          id: parsed.id,
          filename: file,
          createdAt: parsed.createdAt,
          size: stats.size
        });
      }
    }

    // Sort by date, newest first
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { success: true, backups };
  } catch (e) {
    return { success: false, backups: [], error: (e as Error).message };
  }
}

export async function restoreBackup(serverId: string, backupId: string): Promise<OperationResult> {
  try {
    const serverDir = getServerDataDir(serverId);
    const backupPath = getBackupPathFromId(serverId, backupId);
    if (!backupPath) {
      return { success: false, error: 'Invalid backup id' };
    }

    try {
      await fs.access(backupPath);
    } catch {
      return { success: false, error: 'Backup not found' };
    }

    const restoreTmpDir = path.join(serverDir, `.restore-tmp-${Date.now()}`);
    const rollbackRoot = path.join(serverDir, `.restore-backup-${Date.now()}`);
    const foldersToRestore = ['universe', 'config', 'mods', 'logs'];

    try {
      await fs.rm(restoreTmpDir, { recursive: true, force: true });
      await fs.mkdir(restoreTmpDir, { recursive: true });
      await Extract(backupPath, { dir: restoreTmpDir });

      const extractedEntries = await listTopLevelEntries(restoreTmpDir);
      if (!hasAllowedBackupContent(extractedEntries)) {
        return { success: false, error: 'Backup archive has no restorable content' };
      }

      for (const folder of foldersToRestore) {
        const sourceDir = path.join(restoreTmpDir, folder);
        const targetDir = path.join(serverDir, folder);
        await replaceDirectory(targetDir, sourceDir, rollbackRoot);
      }

      const rootConfigFiles = extractedEntries.filter(
        (entry) => !entry.includes('/') && /\.(json|ya?ml|properties)$/i.test(entry)
      );

      for (const file of rootConfigFiles) {
        const sourceFile = path.join(restoreTmpDir, file);
        const targetFile = path.join(serverDir, file);
        const rollbackFile = path.join(rollbackRoot, file);
        const exists = await fs
          .access(targetFile)
          .then(() => true)
          .catch(() => false);
        if (exists) {
          await fs.mkdir(path.dirname(rollbackFile), { recursive: true });
          await fs.rename(targetFile, rollbackFile);
        }
        await fs.copyFile(sourceFile, targetFile);
      }
    } catch (e) {
      // Attempt rollback to preserve previous state
      for (const folder of foldersToRestore) {
        const rollbackDir = path.join(rollbackRoot, folder);
        const targetDir = path.join(serverDir, folder);
        const rollbackExists = await fs
          .access(rollbackDir)
          .then(() => true)
          .catch(() => false);
        if (!rollbackExists) continue;
        try {
          await fs.rm(targetDir, { recursive: true, force: true });
          await fs.rename(rollbackDir, targetDir);
        } catch {
          /* ignore rollback failure */
        }
      }

      try {
        const rollbackFiles = await fs.readdir(rollbackRoot);
        for (const file of rollbackFiles) {
          const rollbackFile = path.join(rollbackRoot, file);
          const targetFile = path.join(serverDir, file);
          const stat = await fs.stat(rollbackFile);
          if (!stat.isFile()) continue;
          await fs.rm(targetFile, { force: true });
          await fs.rename(rollbackFile, targetFile);
        }
      } catch {
        /* ignore rollback failure */
      }

      return { success: false, error: `Failed to restore backup: ${(e as Error).message}` };
    } finally {
      await fs.rm(restoreTmpDir, { recursive: true, force: true }).catch(() => undefined);
      await fs.rm(rollbackRoot, { recursive: true, force: true }).catch(() => undefined);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteBackup(serverId: string, backupId: string): Promise<OperationResult> {
  const backupPath = getBackupPathFromId(serverId, backupId);
  if (!backupPath) {
    return { success: false, error: 'Invalid backup id' };
  }
  const filename = path.basename(backupPath);

  try {
    const backupsDir = getBackupsDir(serverId);

    console.log(`[Backups] Deleting backup: ${filename} for server ${serverId}`);

    try {
      await fs.unlink(backupPath);
      console.log(`[Backups] Successfully deleted: ${filename}`);
      return { success: true };
    } catch (e) {
      // If file does not exist, return error
      const err = e as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        const msg = `Backup not found: ${filename}`;
        console.error(`[Backups] ${msg}`);
        return { success: false, error: msg };
      }

      // Fallback: move to .trash directory inside backups
      try {
        const trashDir = path.join(backupsDir, '.trash');
        await fs.mkdir(trashDir, { recursive: true });
        const dest = path.join(trashDir, `${filename}.deleted-${Date.now()}`);
        try {
          await fs.rename(backupPath, dest);
          console.log(`[Backups] Moved ${filename} to trash: ${dest}`);
          return { success: true };
        } catch (error_) {
          const me = error_ as NodeJS.ErrnoException;
          console.warn(`[Backups] Rename to trash failed (${me.code}), attempting copy fallback`);
          try {
            await fs.copyFile(backupPath, dest);
            await fs.unlink(backupPath);
            console.log(`[Backups] Copied ${filename} to trash: ${dest}`);
            return { success: true };
          } catch (error__) {
            const msg = (error__ as Error).message || (error_ as Error).message;
            console.error(`[Backups] Failed to delete or move ${filename}: ${msg}`);
            return { success: false, error: msg };
          }
        }
      } catch (error_) {
        const msg = (error_ as Error).message || (e as Error).message;
        console.error(`[Backups] Failed to delete or move ${filename}: ${msg}`);
        return { success: false, error: msg };
      }
    }
  } catch (e) {
    const error = (e as Error).message;
    console.error(`[Backups] Failed to delete ${filename}: ${error}`);
    return { success: false, error };
  }
}

export async function cleanupOldBackups(serverId: string, backupConfig: BackupConfig, dryRun = false): Promise<void> {
  try {
    const result = await listBackups(serverId);
    if (!result.success || result.backups.length === 0) {
      console.log(`[Backups] No backups found for cleanup on ${serverId}`);
      return;
    }

    const backups = result.backups;
    const now = Date.now();
    const maxAgeMs = backupConfig.maxAgeDays * 24 * 60 * 60 * 1000;

    let toDelete: BackupInfo[] = [];

    // Delete by age
    if (backupConfig.maxAgeDays > 0) {
      toDelete = backups.filter((b) => {
        const age = now - new Date(b.createdAt).getTime();
        return age > maxAgeMs;
      });

      if (toDelete.length > 0) {
        console.log(
          `[Backups] Found ${toDelete.length} backup(s) older than ${backupConfig.maxAgeDays} days for ${serverId}`
        );
      }
    }

    // Delete by count (keep maxBackups newest)
    if (backupConfig.maxBackups > 0) {
      const remaining = backups.filter((b) => !toDelete.includes(b));
      if (remaining.length > backupConfig.maxBackups) {
        const excess = remaining.slice(backupConfig.maxBackups);
        toDelete.push(...excess);
        console.log(
          `[Backups] Found ${excess.length} excess backup(s) over limit of ${backupConfig.maxBackups} for ${serverId}`
        );
      }
    }

    if (toDelete.length === 0) {
      console.log(`[Backups] No old backups to delete for ${serverId}`);
      return;
    }
    // If dryRun is requested, just log what would be deleted
    if (dryRun) {
      console.log(
        `[Backups] Dry run - would delete ${toDelete.length} backup(s) for ${serverId}: ${toDelete.map((b) => b.filename).join(', ')}`
      );
      return;
    }

    // Delete the backups and track results
    let successCount = 0;
    let failCount = 0;

    for (const backup of toDelete) {
      const ageInDays = Math.floor((now - new Date(backup.createdAt).getTime()) / (24 * 60 * 60 * 1000));
      console.log(`[Backups] Attempting to delete old backup: ${backup.filename} (age: ${ageInDays} days)`);

      const deleteResult = await deleteBackup(serverId, backup.id);
      if (deleteResult.success) {
        successCount++;
      } else {
        failCount++;
        console.error(`[Backups] Failed to delete ${backup.filename}: ${deleteResult.error}`);
      }
    }

    console.log(`[Backups] Cleanup completed for ${serverId}: ${successCount} deleted, ${failCount} failed`);
  } catch (e) {
    console.error(`[Backups] Cleanup error for ${serverId}:`, (e as Error).message);
  }
}

export function startBackupScheduler(serverId: string, backupConfig: BackupConfig): void {
  // Stop existing scheduler if any
  stopBackupScheduler(serverId);

  if (!backupConfig.enabled || backupConfig.intervalMinutes <= 0) {
    return;
  }

  const intervalMs = backupConfig.intervalMinutes * 60 * 1000;

  const timer = setInterval(async () => {
    console.log(`[Backups] Creating scheduled backup for ${serverId}`);
    const result = await createBackup(serverId);
    if (result.success) {
      console.log(`[Backups] Scheduled backup created: ${result.backup?.filename}`);
      await cleanupOldBackups(serverId, backupConfig);
    } else {
      console.error(`[Backups] Scheduled backup failed: ${result.error}`);
    }
  }, intervalMs);

  activeSchedulers.set(serverId, timer);
  console.log(`[Backups] Scheduler started for ${serverId}, interval: ${backupConfig.intervalMinutes}min`);
}

export function stopBackupScheduler(serverId: string): void {
  const timer = activeSchedulers.get(serverId);
  if (timer) {
    clearInterval(timer);
    activeSchedulers.delete(serverId);
    console.log(`[Backups] Scheduler stopped for ${serverId}`);
  }
}

export function stopAllSchedulers(): void {
  for (const [serverId, timer] of activeSchedulers) {
    clearInterval(timer);
    console.log(`[Backups] Scheduler stopped for ${serverId}`);
  }
  activeSchedulers.clear();
}
