import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import type { Socket } from "socket.io";

const mockGetStatus = jest.fn<() => Promise<{ running: boolean }>>();
const mockRestart = jest.fn<(containerName: string) => Promise<{ success: boolean; error?: string }>>();
const mockStop = jest.fn<() => Promise<void>>();
const mockExecCommand =
  jest.fn<
    (cmd: string, timeout?: number, containerName?: string) => Promise<string>
  >();
const mockDownloadServerFiles =
  jest.fn<
    (
      socket: Socket,
      containerName: string,
      serverId: string,
      channel?: 'stable' | 'pre-release'
    ) => Promise<{ success: boolean; error?: string }>
  >();
const mockCheckServerFiles =
  jest.fn<
    () => Promise<{ hasJar: boolean; hasAssets: boolean; ready: boolean }>
  >();

jest.unstable_mockModule("../src/services/docker.js", () => ({
  getStatus: mockGetStatus,
  restart: mockRestart,
  stop: mockStop,
  execCommand: mockExecCommand,
}));

jest.unstable_mockModule("../src/services/downloader.js", () => ({
  downloadServerFiles: mockDownloadServerFiles,
}));

jest.unstable_mockModule("../src/services/files.js", () => ({
  checkServerFiles: mockCheckServerFiles,
}));

const { applyUpdate, checkForUpdate } =
  await import("../src/services/updater.js");

describe("Updater Service", () => {
  let mockSocket: { emit: ReturnType<typeof jest.fn> };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = { emit: jest.fn() };
    mockGetStatus.mockResolvedValue({ running: true });
    mockRestart.mockResolvedValue({ success: true });
    mockStop.mockResolvedValue();
    mockExecCommand.mockResolvedValue("{}");
    mockDownloadServerFiles.mockResolvedValue({ success: true });
    mockCheckServerFiles.mockResolvedValue({
      hasJar: true,
      hasAssets: true,
      ready: true,
    });
  });

  describe("applyUpdate", () => {
    test("downloads files without stopping container", async () => {
      mockExecCommand.mockImplementation((cmd: string) => {
        if (cmd.includes("stat")) return Promise.resolve("1024");
        if (cmd.includes("md5sum")) return Promise.resolve("abcd1234");
        return Promise.resolve("{}");
      });

      await applyUpdate(mockSocket as any, "test-container", "test-server");

      // Should NOT call stop()
      expect(mockStop).not.toHaveBeenCalled();

      // Should call download
      expect(mockDownloadServerFiles).toHaveBeenCalledWith(
        mockSocket as any,
        "test-container",
        "test-server",
        "stable",
      );

      // Should restart since server was running
      expect(mockRestart).toHaveBeenCalledWith("test-container");

      // Should emit success
      expect(mockSocket.emit).toHaveBeenCalledWith("update:status", {
        status: "complete",
        message: "Update complete!",
        serverId: "test-server",
      });
    });

    test("does not restart if server was not running", async () => {
      mockGetStatus.mockResolvedValue({ running: false });
      mockExecCommand.mockImplementation((cmd: string) => {
        if (cmd.includes("stat")) return Promise.resolve("1024");
        if (cmd.includes("md5sum")) return Promise.resolve("abcd1234");
        return Promise.resolve("{}");
      });

      await applyUpdate(mockSocket as any, "test-container", "test-server");

      expect(mockDownloadServerFiles).toHaveBeenCalled();
      expect(mockRestart).not.toHaveBeenCalled();
      expect(mockStop).not.toHaveBeenCalled();
    });

    test("emits downloading status before download", async () => {
      mockExecCommand.mockResolvedValue("{}");

      await applyUpdate(mockSocket as any, "test-container", "test-server");

      expect(mockSocket.emit).toHaveBeenCalledWith("update:status", {
        status: "downloading",
        message: "Downloading update...",
        serverId: "test-server",
      });
    });

    test("handles download errors gracefully", async () => {
      mockDownloadServerFiles.mockResolvedValue({ success: false, error: "Download failed" });

      const result = await applyUpdate(
        mockSocket as any,
        "test-container",
        "test-server",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Download failed");
      expect(mockSocket.emit).toHaveBeenCalledWith("update:status", {
        status: "error",
        message: "Download failed",
        serverId: "test-server",
      });
    });

    test("emits restart status when restarting", async () => {
      mockGetStatus.mockResolvedValue({ running: true });
      mockExecCommand.mockImplementation((cmd: string) => {
        if (cmd.includes("stat")) return Promise.resolve("1024");
        if (cmd.includes("md5sum")) return Promise.resolve("abcd1234");
        return Promise.resolve("{}");
      });

      await applyUpdate(mockSocket as any, "test-container", "test-server");

      expect(mockSocket.emit).toHaveBeenCalledWith("update:status", {
        status: "restarting",
        message: "Restarting server to apply update...",
        serverId: "test-server",
      });
    });

    test("fails update when restart fails", async () => {
      mockGetStatus.mockResolvedValue({ running: true });
      mockRestart.mockResolvedValue({ success: false, error: "Restart failed" });
      mockExecCommand.mockImplementation((cmd: string) => {
        if (cmd.includes("stat")) return Promise.resolve("1024");
        if (cmd.includes("md5sum")) return Promise.resolve("abcd1234");
        return Promise.resolve("{}");
      });

      const result = await applyUpdate(mockSocket as any, "test-container", "test-server");

      expect(result).toEqual({ success: false, error: "Restart failed" });
      expect(mockSocket.emit).toHaveBeenCalledWith("update:status", {
        status: "error",
        message: "Restart failed",
        serverId: "test-server",
      });
    });
  });

  describe("checkForUpdate", () => {
    test("returns update info when metadata exists", async () => {
      const lastUpdate = new Date("2024-01-01").toISOString();
      mockExecCommand.mockResolvedValue(
        JSON.stringify({
          lastDownloadAt: lastUpdate,
          jarSize: 1024,
          jarHash: "abc123",
          assetsSize: null,
        }),
      );

      const result = await checkForUpdate("test-server", "test-container");

      expect(result.success).toBe(true);
      expect(result.lastUpdate).toBe(lastUpdate);
      expect(result.hasFiles).toBe(true);
      expect(result.daysSinceUpdate).toBeGreaterThan(0);
    });

    test("handles missing metadata gracefully", async () => {
      mockExecCommand.mockResolvedValue("{}");

      const result = await checkForUpdate("test-server", "test-container");

      expect(result.success).toBe(true);
      expect(result.lastUpdate).toBeNull();
      expect(result.daysSinceUpdate).toBeNull();
    });

    test("reports update available when remote version differs from installed", async () => {
      mockExecCommand.mockImplementation((cmd: string) => {
        if (cmd.includes("-print-version")) return Promise.resolve("2026.07.01-abc1234\n");
        if (cmd.includes(".update-metadata.json")) {
          return Promise.resolve(
            JSON.stringify({
              lastDownloadAt: new Date("2026-06-01").toISOString(),
              jarSize: 1024,
              jarHash: "abc123",
              assetsSize: null,
              installedVersion: "2026.06.01-def5678",
            }),
          );
        }
        return Promise.resolve("{}");
      });

      const result = await checkForUpdate("test-server", "test-container");

      expect(result.success).toBe(true);
      expect(result.currentVersion).toBe("2026.06.01-def5678");
      expect(result.latestVersion).toBe("2026.07.01-abc1234");
      expect(result.updateAvailable).toBe(true);
    });

    test("reports up to date when versions match", async () => {
      mockExecCommand.mockImplementation((cmd: string) => {
        if (cmd.includes("-print-version")) return Promise.resolve("2026.07.01-abc1234\n");
        if (cmd.includes(".update-metadata.json")) {
          return Promise.resolve(
            JSON.stringify({
              lastDownloadAt: new Date("2026-07-01").toISOString(),
              jarSize: 1024,
              jarHash: "abc123",
              assetsSize: null,
              installedVersion: "2026.07.01-abc1234",
            }),
          );
        }
        return Promise.resolve("{}");
      });

      const result = await checkForUpdate("test-server", "test-container");

      expect(result.updateAvailable).toBe(false);
    });

    test("leaves updateAvailable null when remote version cannot be determined", async () => {
      mockExecCommand.mockImplementation((cmd: string) => {
        // Downloader prompting for auth instead of printing a version
        if (cmd.includes("-print-version")) return Promise.resolve("Visit oauth.accounts.hytale.com to log in\n");
        return Promise.resolve("{}");
      });

      const result = await checkForUpdate("test-server", "test-container");

      expect(result.success).toBe(true);
      expect(result.latestVersion).toBeNull();
      expect(result.updateAvailable).toBeNull();
    });

    test("returns error on failure", async () => {
      mockExecCommand.mockRejectedValue(new Error("Failed to read"));
      mockCheckServerFiles.mockRejectedValue(new Error("Failed"));

      const result = await checkForUpdate("test-server", "test-container");

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test("returns semantic error when server is not running", async () => {
      mockGetStatus.mockResolvedValue({ running: false });

      const result = await checkForUpdate("test-server", "test-container");

      expect(result).toEqual({
        success: false,
        lastUpdate: null,
        daysSinceUpdate: null,
        hasFiles: false,
        code: "CONTAINER_NOT_RUNNING",
        error: "Server is offline. Start it from Control tab and try again.",
      });
      expect(mockCheckServerFiles).not.toHaveBeenCalled();
    });
  });
});
