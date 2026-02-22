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

// Use real fs but mock rename to throw for temp files
const realFs = await import("node:fs/promises");

jest.unstable_mockModule("node:fs/promises", () => {
  return {
    ...(realFs as any),
    rename: async (src: string, dest: string) => {
      // If source looks like a temp backup file, simulate EXDEV
      if (src.endsWith(".tmp")) {
        const err: any = new Error("cross-device link not permitted");
        err.code = "EXDEV";
        throw err;
      }
      return (realFs as any).rename(src, dest);
    },
  } as typeof realFs;
});

jest.unstable_mockModule("../src/config/index.js", () => ({
  default: {
    data: { path: "/tmp/test-data" },
  },
}));

const fs = await import("node:fs/promises");
const { createBackup } = await import("../src/services/backups.js");

describe("createBackup fallback on rename (EXDEV)", () => {
  let tempDir: string;
  let serverDir: string;
  let backupsDir: string;
  const testServerId = "test-server-rename";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "hytale-backup-test-"));
    serverDir = path.join(tempDir, "servers", testServerId, "server");
    backupsDir = path.join(tempDir, "servers", testServerId, "backups");
    await fs.mkdir(path.join(serverDir, "universe"), { recursive: true });
    await fs.mkdir(path.join(serverDir, "config"), { recursive: true });
    await fs.mkdir(path.join(serverDir, "mods"), { recursive: true });
    await fs.mkdir(path.join(serverDir, "logs"), { recursive: true });

    // Patch config path
    const config = await import("../src/config/index.js");
    (config.default.data as any).path = tempDir;
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test("creates backup via copy fallback when rename throws EXDEV", async () => {
    const res = await createBackup(testServerId);
    expect(res.success).toBe(true);

    // Ensure no .tmp remains and a .zip exists
    const files = await fs.readdir(
      path.join(tempDir, "servers", testServerId, "backups"),
    );
    expect(files.some((f) => f.endsWith(".zip"))).toBe(true);
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
  });
});
