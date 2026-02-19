import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

// Mock docker service before importing files
const mockExecCommand =
  jest.fn<typeof import("../src/services/docker.js").execCommand>();
jest.unstable_mockModule("../src/services/docker.js", () => ({
  execCommand: mockExecCommand,
}));

describe("Files Service - Docker Fallback", () => {
  let checkServerFiles: (
    serverId: string,
    containerName?: string,
  ) => Promise<{
    hasJar: boolean;
    hasAssets: boolean;
    ready: boolean;
  }>;
  let checkAuth: (serverId: string, containerName?: string) => Promise<boolean>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const filesModule = await import("../src/services/files.js");
    checkServerFiles = filesModule.checkServerFiles;
    checkAuth = filesModule.checkAuth;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("checkServerFiles falls back to Docker exec when filesystem access fails", async () => {
    // Simulate direct filesystem access failure (TrueNAS scenario)
    // Files exist inside container but not accessible from panel
    mockExecCommand.mockResolvedValue("HytaleServer.jar\nAssets.zip\nconfig\n");

    const result = await checkServerFiles(
      "nonexistent-server",
      "test-container",
    );

    expect(result.hasJar).toBe(true);
    expect(result.hasAssets).toBe(true);
    expect(result.ready).toBe(true);
    expect(mockExecCommand).toHaveBeenCalledWith(
      "ls -1 /opt/hytale",
      5000,
      "test-container",
    );
  });

  test("checkServerFiles detects missing files via Docker exec", async () => {
    mockExecCommand.mockResolvedValue("config\nmods\n");

    const result = await checkServerFiles("test-server", "test-container");

    expect(result.hasJar).toBe(false);
    expect(result.hasAssets).toBe(false);
    expect(result.ready).toBe(false);
  });

  test("checkServerFiles returns false when no containerName provided on filesystem failure", async () => {
    // No filesystem access, no containerName = can't check
    const result = await checkServerFiles("nonexistent-server");

    expect(result.hasJar).toBe(false);
    expect(result.hasAssets).toBe(false);
    expect(result.ready).toBe(false);
    expect(mockExecCommand).not.toHaveBeenCalled();
  });

  test("checkAuth falls back to Docker exec when filesystem access fails", async () => {
    mockExecCommand.mockResolvedValue(
      '{"access_token":"ya29.xxx","refresh_token":"1//xxx"}',
    );

    const result = await checkAuth("nonexistent-server", "test-container");

    expect(result).toBe(true);
    expect(mockExecCommand).toHaveBeenCalledWith(
      'cat /opt/hytale/.hytale-downloader-credentials.json 2>/dev/null || echo ""',
      5000,
      "test-container",
    );
  });

  test("checkAuth detects missing credentials via Docker exec", async () => {
    mockExecCommand.mockResolvedValue("");

    const result = await checkAuth("test-server", "test-container");

    expect(result).toBe(false);
  });

  test("checkAuth returns false when no containerName provided on filesystem failure", async () => {
    const result = await checkAuth("nonexistent-server");

    expect(result).toBe(false);
    expect(mockExecCommand).not.toHaveBeenCalled();
  });

  test("checkAuth handles Docker exec errors gracefully", async () => {
    mockExecCommand.mockRejectedValue(new Error("Container not running"));

    const result = await checkAuth("test-server", "test-container");

    expect(result).toBe(false);
  });
});
