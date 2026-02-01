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

// Mock the servers module to provide getServerDataPath
const mockServerDataPath = jest.fn<(id: string) => string>();

jest.unstable_mockModule("../src/services/servers.js", () => ({
  getServerDataPath: mockServerDataPath,
}));

const {
  isAllowedUpload,
  isEditable,
  checkServerFiles,
  checkAuth,
  wipeData,
  listDirectory,
} = await import("../src/services/files.js");

describe("Files Service", () => {
  let tempDir: string;
  const testServerId = "test-server-123";

  beforeEach(async () => {
    jest.clearAllMocks();
    // Create a temp directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "hytale-test-"));
    mockServerDataPath.mockReturnValue(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Security: isAllowedUpload", () => {
    test("allows safe file types", () => {
      expect(isAllowedUpload("plugin.jar")).toBe(true);
      expect(isAllowedUpload("backup.zip")).toBe(true);
      expect(isAllowedUpload("config.json")).toBe(true);
      expect(isAllowedUpload("config.yaml")).toBe(true);
    });

    test("blocks dangerous file types", () => {
      expect(isAllowedUpload("virus.exe")).toBe(false);
      expect(isAllowedUpload("malware.dll")).toBe(false);
      expect(isAllowedUpload("hack.com")).toBe(false);
    });

    test("handles case insensitivity", () => {
      expect(isAllowedUpload("CONFIG.JSON")).toBe(true);
      expect(isAllowedUpload("VIRUS.EXE")).toBe(false);
    });
  });

  describe("Security: isEditable", () => {
    test("allows editable file types", () => {
      expect(isEditable("config.json")).toBe(true);
      expect(isEditable("config.yaml")).toBe(true);
      expect(isEditable("server.properties")).toBe(true);
      expect(isEditable("script.lua")).toBe(true);
    });

    test("blocks non-editable file types", () => {
      expect(isEditable("binary.jar")).toBe(false);
      expect(isEditable("archive.zip")).toBe(false);
      expect(isEditable("image.png")).toBe(false);
    });
  });

  describe("checkServerFiles", () => {
    test("returns ready when both files exist", async () => {
      await fs.writeFile(path.join(tempDir, "HytaleServer.jar"), "test");
      await fs.writeFile(path.join(tempDir, "Assets.zip"), "test");

      const result = await checkServerFiles(testServerId);
      expect(result.ready).toBe(true);
      expect(result.hasJar).toBe(true);
      expect(result.hasAssets).toBe(true);
    });

    test("returns not ready when files missing", async () => {
      const result = await checkServerFiles(testServerId);
      expect(result.ready).toBe(false);
      expect(result.hasJar).toBe(false);
      expect(result.hasAssets).toBe(false);
    });

    test("returns partial status when only jar exists", async () => {
      await fs.writeFile(path.join(tempDir, "HytaleServer.jar"), "test");

      const result = await checkServerFiles(testServerId);
      expect(result.ready).toBe(false);
      expect(result.hasJar).toBe(true);
      expect(result.hasAssets).toBe(false);
    });
  });

  describe("checkAuth", () => {
    test("returns true when valid credentials exist", async () => {
      await fs.writeFile(
        path.join(tempDir, ".hytale-downloader-credentials.json"),
        JSON.stringify({ access_token: "abc123" }),
      );

      const result = await checkAuth(testServerId);
      expect(result).toBe(true);
    });

    test("returns false when no credentials", async () => {
      const result = await checkAuth(testServerId);
      expect(result).toBe(false);
    });

    test("returns false when credentials invalid", async () => {
      await fs.writeFile(
        path.join(tempDir, ".hytale-downloader-credentials.json"),
        "{}",
      );

      const result = await checkAuth(testServerId);
      expect(result).toBe(false);
    });
  });

  describe("wipeData", () => {
    test("removes data directories and files", async () => {
      // Create some test data
      await fs.mkdir(path.join(tempDir, "universe"), { recursive: true });
      await fs.mkdir(path.join(tempDir, "logs"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "universe", "test.dat"), "test");
      await fs.writeFile(
        path.join(tempDir, ".hytale-downloader-credentials.json"),
        "test",
      );

      const result = await wipeData(testServerId);
      expect(result.success).toBe(true);

      // Check credentials were deleted
      await expect(
        fs.access(path.join(tempDir, ".hytale-downloader-credentials.json")),
      ).rejects.toThrow();

      // Check universe was cleared but exists
      const universeDir = await fs.readdir(path.join(tempDir, "universe"));
      expect(universeDir).toHaveLength(0);
    });
  });

  describe("listDirectory", () => {
    test("lists files in directory", async () => {
      await fs.writeFile(path.join(tempDir, "test.json"), "{}");
      await fs.mkdir(path.join(tempDir, "subdir"));

      const result = await listDirectory("/", testServerId);

      expect(result.success).toBe(true);
      expect(result.files.length).toBe(2);

      const jsonFile = result.files.find((f) => f.name === "test.json");
      expect(jsonFile?.editable).toBe(true);
      expect(jsonFile?.isDirectory).toBe(false);

      const subdir = result.files.find((f) => f.name === "subdir");
      expect(subdir?.isDirectory).toBe(true);
    });

    test("sorts directories first", async () => {
      await fs.writeFile(path.join(tempDir, "aaa.txt"), "");
      await fs.mkdir(path.join(tempDir, "zzz"));

      const result = await listDirectory("/", testServerId);

      expect(result.files[0].name).toBe("zzz");
      expect(result.files[0].isDirectory).toBe(true);
    });
  });
});
