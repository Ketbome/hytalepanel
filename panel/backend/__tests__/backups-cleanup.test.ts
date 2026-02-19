import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

// Mock config module
jest.unstable_mockModule("../src/config/index.js", () => ({
  default: {
    data: {
      path: "/tmp/test-data",
    },
  },
}));

import type { BackupConfig, BackupInfo } from "../src/services/backups.js";

const {
  createBackup,
  listBackups,
  deleteBackup,
  cleanupOldBackups,
} = await import("../src/services/backups.js");

describe("Backup Cleanup", () => {
  let tempDir: string;
  let backupsDir: string;
  let serverDir: string;
  const testServerId = "test-server-cleanup";

  // Helper to create a fake backup file with specific timestamp
  async function createFakeBackup(daysOld: number): Promise<string> {
    const date = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const timestamp = date
      .toISOString()
      .replaceAll(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `backup-${timestamp}.zip`;
    const filePath = path.join(backupsDir, filename);

    // Create empty zip file
    await fs.writeFile(filePath, "fake backup content");

    // Set modification time to match the date
    await fs.utimes(filePath, date, date);

    return filename;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create temp directory structure
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "hytale-backup-test-"));
    serverDir = path.join(tempDir, "servers", testServerId, "server");
    backupsDir = path.join(tempDir, "servers", testServerId, "backups");

    await fs.mkdir(serverDir, { recursive: true });
    await fs.mkdir(backupsDir, { recursive: true });

    // Mock config to use temp directory
    const config = await import("../src/config/index.js");
    (config.default.data as any).path = tempDir;

    // Create required server folders for backup creation
    await fs.mkdir(path.join(serverDir, "universe"), { recursive: true });
    await fs.mkdir(path.join(serverDir, "config"), { recursive: true });
    await fs.mkdir(path.join(serverDir, "mods"), { recursive: true });
    await fs.mkdir(path.join(serverDir, "logs"), { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("cleanupOldBackups - Age-based deletion", () => {
    test("deletes backups older than maxAgeDays", async () => {
      // Create backups: 1 day old, 3 days old, 5 days old
      await createFakeBackup(1);
      const old3days = await createFakeBackup(3);
      const old5days = await createFakeBackup(5);

      const config: BackupConfig = {
        enabled: true,
        intervalMinutes: 60,
        maxBackups: 0, // unlimited count
        maxAgeDays: 2, // delete older than 2 days
        onServerStart: false,
      };

      await cleanupOldBackups(testServerId, config);

      const result = await listBackups(testServerId);
      expect(result.success).toBe(true);
      expect(result.backups.length).toBe(1);
      expect(result.backups[0].filename).not.toBe(old3days);
      expect(result.backups[0].filename).not.toBe(old5days);
    });

    test("keeps backups newer than maxAgeDays", async () => {
      const recent = await createFakeBackup(0.5); // 12 hours old
      await createFakeBackup(5); // 5 days old

      const config: BackupConfig = {
        enabled: true,
        intervalMinutes: 60,
        maxBackups: 0,
        maxAgeDays: 1,
        onServerStart: false,
      };

      await cleanupOldBackups(testServerId, config);

      const result = await listBackups(testServerId);
      expect(result.success).toBe(true);
      expect(result.backups.length).toBe(1);
      expect(result.backups[0].filename).toBe(recent);
    });

    test("maxAgeDays=0 means unlimited, keeps all backups", async () => {
      await createFakeBackup(1);
      await createFakeBackup(5);
      await createFakeBackup(10);

      const config: BackupConfig = {
        enabled: true,
        intervalMinutes: 60,
        maxBackups: 0,
        maxAgeDays: 0, // unlimited age
        onServerStart: false,
      };

      await cleanupOldBackups(testServerId, config);

      const result = await listBackups(testServerId);
      expect(result.success).toBe(true);
      expect(result.backups.length).toBe(3);
    });

    test("maxBackups=0 does not interfere with age-based cleanup", async () => {
      // This is the exact user scenario: maxBackups=0, maxAgeDays=2
      await createFakeBackup(1);
      await createFakeBackup(3);
      await createFakeBackup(5);

      const config: BackupConfig = {
        enabled: true,
        intervalMinutes: 60,
        maxBackups: 0, // This should NOT prevent age cleanup
        maxAgeDays: 2,
        onServerStart: false,
      };

      await cleanupOldBackups(testServerId, config);

      const result = await listBackups(testServerId);
      expect(result.success).toBe(true);
      // Should keep only the 1-day-old backup
      expect(result.backups.length).toBe(1);
    });
  });

  describe("cleanupOldBackups - Count-based deletion", () => {
    test("keeps only maxBackups newest backups", async () => {
      await createFakeBackup(1);
      await createFakeBackup(2);
      await createFakeBackup(3);
      await createFakeBackup(4);
      await createFakeBackup(5);

      const config: BackupConfig = {
        enabled: true,
        intervalMinutes: 60,
        maxBackups: 2, // keep only 2 newest
        maxAgeDays: 0, // unlimited age
        onServerStart: false,
      };

      await cleanupOldBackups(testServerId, config);

      const result = await listBackups(testServerId);
      expect(result.success).toBe(true);
      expect(result.backups.length).toBe(2);
    });

    test("combines age and count limits correctly", async () => {
      await createFakeBackup(0.5); // very recent
      await createFakeBackup(1);
      await createFakeBackup(2);
      await createFakeBackup(7); // old
      await createFakeBackup(10); // very old

      const config: BackupConfig = {
        enabled: true,
        intervalMinutes: 60,
        maxBackups: 2, // keep 2 newest
        maxAgeDays: 5, // but also delete anything older than 5 days
        onServerStart: false,
      };

      await cleanupOldBackups(testServerId, config);

      const result = await listBackups(testServerId);
      expect(result.success).toBe(true);
      // Should have at most 2 backups, and none older than 5 days
      expect(result.backups.length).toBeLessThanOrEqual(2);
      for (const backup of result.backups) {
        const age =
          (Date.now() - new Date(backup.createdAt).getTime()) /
          (24 * 60 * 60 * 1000);
        expect(age).toBeLessThan(5);
      }
    });
  });

  describe("cleanupOldBackups - Edge cases", () => {
    test("handles empty backup directory gracefully", async () => {
      const config: BackupConfig = {
        enabled: true,
        intervalMinutes: 60,
        maxBackups: 5,
        maxAgeDays: 7,
        onServerStart: false,
      };

      // Should not throw
      await expect(cleanupOldBackups(testServerId, config)).resolves.not.toThrow();
    });

    test("handles cleanup when all backups should be deleted", async () => {
      await createFakeBackup(10);
      await createFakeBackup(15);
      await createFakeBackup(20);

      const config: BackupConfig = {
        enabled: true,
        intervalMinutes: 60,
        maxBackups: 0,
        maxAgeDays: 1, // all are too old
        onServerStart: false,
      };

      await cleanupOldBackups(testServerId, config);

      const result = await listBackups(testServerId);
      expect(result.success).toBe(true);
      expect(result.backups.length).toBe(0);
    });

    test("continues cleanup even if one deletion fails", async () => {
      const backup1 = await createFakeBackup(5);
      const backup2 = await createFakeBackup(6);
      const backup3 = await createFakeBackup(7);

      // Delete one backup file to simulate a missing file error
      const backup2Path = path.join(backupsDir, backup2);
      await fs.unlink(backup2Path);

      const config: BackupConfig = {
        enabled: true,
        intervalMinutes: 60,
        maxBackups: 0,
        maxAgeDays: 1,
        onServerStart: false,
      };

      // Should not throw even though one file is missing
      await expect(cleanupOldBackups(testServerId, config)).resolves.not.toThrow();

      const result = await listBackups(testServerId);
      // Should still have deleted the other old backups
      expect(result.backups.length).toBe(0);
    });
  });

  describe("deleteBackup", () => {
    test("successfully deletes existing backup", async () => {
      const filename = await createFakeBackup(1);
      const backupId = filename.replace("backup-", "").replace(".zip", "");

      const result = await deleteBackup(testServerId, backupId);
      expect(result.success).toBe(true);

      const listResult = await listBackups(testServerId);
      expect(listResult.backups.length).toBe(0);
    });

    test("returns error for non-existent backup", async () => {
      const result = await deleteBackup(testServerId, "non-existent-id");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("listBackups", () => {
    test("lists backups in order (newest first)", async () => {
      await createFakeBackup(5);
      await createFakeBackup(3);
      await createFakeBackup(1);

      const result = await listBackups(testServerId);
      expect(result.success).toBe(true);
      expect(result.backups.length).toBe(3);

      // Verify they're sorted newest first
      const dates = result.backups.map((b) => new Date(b.createdAt).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });

    test("returns empty array for non-existent directory", async () => {
      const result = await listBackups("non-existent-server");
      expect(result.success).toBe(true);
      expect(result.backups.length).toBe(0);
    });
  });
});
