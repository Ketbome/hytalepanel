import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import * as path from "node:path";
import * as os from "node:os";

// Import real fs promises to delegate most calls
const realFs = await import("node:fs/promises");

// Mock fs/promises so we can simulate a failing unlink once
jest.unstable_mockModule("node:fs/promises", () => {
  return {
    ...(realFs as any),
    unlink: async (p: string) => {
      const oncePath = (globalThis as any).__unlinkThrowOnce as
        | string
        | undefined;
      if (oncePath) {
        const base = path.basename(oncePath);
        if (p.endsWith(base)) {
          // clear flag and throw EPERM
          delete (globalThis as any).__unlinkThrowOnce;
          const err: any = new Error("permission denied");
          err.code = "EPERM";
          throw err;
        }
      }
      return (realFs as any).unlink(p);
    },
  } as typeof realFs;
});

// Mock config module to be overridden in beforeEach
jest.unstable_mockModule("../src/config/index.js", () => ({
  default: {
    data: {
      path: "/tmp/test-data",
    },
  },
}));

// Now import the modules under test (they'll receive mocked fs)
const fs = await import("node:fs/promises");
const { createBackup, listBackups, deleteBackup } =
  await import("../src/services/backups.js");

describe("Backup atomic and safe-delete behaviour", () => {
  let tempDir: string;
  let backupsDir: string;
  let serverDir: string;
  const testServerId = "test-server-atomic";

  beforeEach(async () => {
    jest.clearAllMocks();

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
      // ignore
    }
  });

  test("createBackup writes atomically (no .tmp left)", async () => {
    const result = await createBackup(testServerId);
    expect(result.success).toBe(true);
    const files = await fs.readdir(backupsDir);
    // ensure there's at least one .zip and no .tmp files
    const zipFiles = files.filter((f) => f.endsWith(".zip"));
    const tmpFiles = files.filter((f) => f.endsWith(".tmp"));
    expect(zipFiles.length).toBeGreaterThan(0);
    expect(tmpFiles.length).toBe(0);

    const list = await listBackups(testServerId);
    expect(list.success).toBe(true);
    expect(list.backups.length).toBeGreaterThan(0);
  });

  test("deleteBackup falls back to .trash when unlink throws", async () => {
    // Create a fake backup file
    const date = new Date();
    const timestamp = date.toISOString().replaceAll(/[:.]/g, "-").slice(0, 19);
    const filename = `backup-${timestamp}.zip`;
    const filePath = path.join(backupsDir, filename);
    await fs.writeFile(filePath, "fake content");

    // Set global flag so mocked unlink will throw for this path once
    (globalThis as any).__unlinkThrowOnce = filePath;

    const res = await deleteBackup(testServerId, timestamp);
    // should succeed because fallback moves to .trash
    expect(res.success).toBe(true);

    // verify file either deleted or moved to .trash
    const trashDir = path.join(backupsDir, ".trash");
    const inBackups = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    const inTrash = (await fs
      .access(trashDir)
      .then(() => true)
      .catch(() => false))
      ? (await fs.readdir(trashDir)).some((f) => f.includes(filename))
      : false;

    expect(inBackups || inTrash).toBe(false);
  });
});
