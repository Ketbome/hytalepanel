import { createWriteStream } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import archiver from 'archiver';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.unstable_mockModule('../src/config/index.js', () => ({
  default: {
    data: {
      path: '/tmp/test-data'
    }
  }
}));

const {
  createBackup,
  listBackups,
  normalizeBackupConfig,
  restoreBackup,
  DEFAULT_BACKUP_CONFIG
} = await import('../src/services/backups.js');

describe('Backups Stability', () => {
  let tempDir: string;
  let backupsDir: string;
  let serverDir: string;
  const testServerId = 'test-server-stability';

  async function createZip(filePath: string, entries: Record<string, string>): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(filePath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', () => resolve());
      output.on('error', reject);
      archive.on('error', reject);

      archive.pipe(output);
      for (const [entryPath, content] of Object.entries(entries)) {
        archive.append(content, { name: entryPath });
      }
      void archive.finalize();
    });
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hytale-backup-test-'));
    serverDir = path.join(tempDir, 'servers', testServerId, 'server');
    backupsDir = path.join(tempDir, 'servers', testServerId, 'backups');

    await fs.mkdir(serverDir, { recursive: true });
    await fs.mkdir(backupsDir, { recursive: true });

    const config = await import('../src/config/index.js');
    (config.default.data as { path: string }).path = tempDir;

    await fs.mkdir(path.join(serverDir, 'universe'), { recursive: true });
    await fs.mkdir(path.join(serverDir, 'config'), { recursive: true });
    await fs.mkdir(path.join(serverDir, 'mods'), { recursive: true });
    await fs.mkdir(path.join(serverDir, 'logs'), { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test('parses legacy backup timestamps as UTC', async () => {
    const filename = 'backup-2026-02-28T00-00-00.zip';
    await fs.writeFile(path.join(backupsDir, filename), 'x');

    const result = await listBackups(testServerId);
    expect(result.success).toBe(true);
    expect(result.backups).toHaveLength(1);
    expect(result.backups[0].createdAt).toBe('2026-02-28T00:00:00.000Z');
  });

  test('normalizes and validates backup config strictly', () => {
    const valid = normalizeBackupConfig({
      enabled: false,
      intervalMinutes: 12,
      maxBackups: 5,
      maxAgeDays: 3,
      onServerStart: true
    });
    expect(valid.success).toBe(true);
    expect(valid.config?.intervalMinutes).toBe(0);

    const invalidFraction = normalizeBackupConfig({
      enabled: true,
      intervalMinutes: 0.1,
      maxBackups: 5,
      maxAgeDays: 3,
      onServerStart: true
    });
    expect(invalidFraction.success).toBe(false);

    const fallbackDefaults = normalizeBackupConfig(undefined, DEFAULT_BACKUP_CONFIG);
    expect(fallbackDefaults.success).toBe(true);
    expect(fallbackDefaults.config).toEqual({
      ...DEFAULT_BACKUP_CONFIG,
      intervalMinutes: 0
    });
  });

  test('prevents overlapping backup creation for same server', async () => {
    const [r1, r2] = await Promise.all([createBackup(testServerId), createBackup(testServerId)]);
    const errors = [r1, r2].filter((r) => !r.success).map((r) => r.error);
    expect(errors).toContain('backup already in progress');
  });

  test('generates unique backup filenames for immediate sequential backups', async () => {
    const r1 = await createBackup(testServerId);
    const r2 = await createBackup(testServerId);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r1.backup?.filename).toBeDefined();
    expect(r2.backup?.filename).toBeDefined();
    expect(r1.backup?.filename).not.toBe(r2.backup?.filename);
  });

  test('restore fails safely on invalid zip and preserves current data', async () => {
    const originalWorldFile = path.join(serverDir, 'universe', 'original.txt');
    await fs.writeFile(originalWorldFile, 'keep-me');

    const brokenBackupId = '2026-02-28T10-00-00';
    await fs.writeFile(path.join(backupsDir, `backup-${brokenBackupId}.zip`), 'not-a-zip');

    const result = await restoreBackup(testServerId, brokenBackupId);
    expect(result.success).toBe(false);

    const stillThere = await fs.readFile(originalWorldFile, 'utf-8');
    expect(stillThere).toBe('keep-me');
  });

  test('restore replaces folders and root config files from backup', async () => {
    await fs.writeFile(path.join(serverDir, 'universe', 'old.txt'), 'old');
    await fs.writeFile(path.join(serverDir, 'settings.json'), '{"old":true}');

    const restoreId = '2026-02-28T11-00-00';
    const zipPath = path.join(backupsDir, `backup-${restoreId}.zip`);

    await createZip(zipPath, {
      'universe/new.txt': 'new-world',
      'config/game.properties': 'difficulty=hard',
      'settings.json': '{"old":false}'
    });

    const result = await restoreBackup(testServerId, restoreId);
    expect(result.success).toBe(true);

    await expect(fs.access(path.join(serverDir, 'universe', 'old.txt'))).rejects.toThrow();
    expect(await fs.readFile(path.join(serverDir, 'universe', 'new.txt'), 'utf-8')).toBe('new-world');
    expect(await fs.readFile(path.join(serverDir, 'config', 'game.properties'), 'utf-8')).toBe('difficulty=hard');
    expect(await fs.readFile(path.join(serverDir, 'settings.json'), 'utf-8')).toBe('{"old":false}');
  });
});
