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

// Active schedulers map
const activeSchedulers = new Map<string, NodeJS.Timeout>();

function getBackupsDir(serverId: string): string {
  return path.join(getServersDir(), serverId, 'backups');
}

function getServerDataDir(serverId: string): string {
  return path.join(getServersDir(), serverId, 'server');
}

function generateBackupFilename(): string {
  const now = new Date();
  const timestamp = now.toISOString().replaceAll(/[:.]/g, '-').slice(0, 19);
  return `backup-${timestamp}.zip`;
}

function parseBackupFilename(filename: string): { id: string; createdAt: string } | null {
  const match = filename.match(/^backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.zip$/);
  if (!match) return null;

  // Convert filename timestamp format (2026-02-18T12-30-45) to ISO (2026-02-18T12:30:45)
  const timestampId = match[1];
  const isoTimestamp = timestampId.replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3');

  return {
    id: timestampId,
    createdAt: new Date(isoTimestamp).toISOString()
  };
}

export async function createBackup(serverId: string): Promise<BackupResult> {
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

    // Create ZIP archive
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(backupPath);
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
    const backupsDir = getBackupsDir(serverId);
    const serverDir = getServerDataDir(serverId);

    // Find backup file
    const filename = `backup-${backupId}.zip`;
    const backupPath = path.join(backupsDir, filename);

    try {
      await fs.access(backupPath);
    } catch {
      return { success: false, error: 'Backup not found' };
    }

    // Clear existing data folders (but keep jar and assets)
    const foldersToRestore = ['universe', 'config', 'mods', 'logs'];
    for (const folder of foldersToRestore) {
      const folderPath = path.join(serverDir, folder);
      try {
        await fs.rm(folderPath, { recursive: true, force: true });
      } catch {
        // Ignore if doesn't exist
      }
    }

    // Extract backup
    await Extract(backupPath, { dir: serverDir });

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteBackup(serverId: string, backupId: string): Promise<OperationResult> {
  const filename = `backup-${backupId}.zip`;

  try {
    const backupsDir = getBackupsDir(serverId);
    const backupPath = path.join(backupsDir, filename);

    console.log(`[Backups] Deleting backup: ${filename} for server ${serverId}`);
    await fs.unlink(backupPath);
    console.log(`[Backups] Successfully deleted: ${filename}`);

    return { success: true };
  } catch (e) {
    const error = (e as Error).message;
    console.error(`[Backups] Failed to delete ${filename}: ${error}`);
    return { success: false, error };
  }
}

export async function cleanupOldBackups(serverId: string, backupConfig: BackupConfig): Promise<void> {
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
