import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

interface UploadResult {
  success: boolean;
  fileName?: string;
}

interface DownloadResult {
  success: boolean;
  fileName?: string;
  localPath?: string;
}

const mockUpload =
  jest.fn<
    (
      dir: string,
      name: string,
      data: Buffer,
      serverId: string,
    ) => Promise<UploadResult>
  >();
const mockDownload =
  jest.fn<(filePath: string, serverId: string) => Promise<DownloadResult>>();

jest.unstable_mockModule("../src/services/files.js", () => ({
  upload: mockUpload,
  download: mockDownload,
}));

const express = (await import("express")).default;
const request = (await import("supertest")).default;
const cookieParser = (await import("cookie-parser")).default;
const { generateToken } = await import("../src/middleware/auth.js");
const apiRoutes = (await import("../src/routes/api.js")).default;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api", apiRoutes);

describe("API Routes", () => {
  const validToken = generateToken("admin");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication required", () => {
    test("returns 401 without token", async () => {
      expect((await request(app).post("/api/files/upload")).status).toBe(401);
      expect((await request(app).get("/api/files/download")).status).toBe(401);
    });
  });

  describe("POST /api/files/upload", () => {
    test("returns 400 without file", async () => {
      const res = await request(app)
        .post("/api/files/upload")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    test("uploads file successfully", async () => {
      mockUpload.mockResolvedValue({ success: true, fileName: "test.txt" });

      const res = await request(app)
        .post("/api/files/upload")
        .set("Authorization", `Bearer ${validToken}`)
        .attach("file", Buffer.from("test"), "test.txt")
        .field("targetDir", "/config")
        .field("serverId", "test-server-id");

      expect(res.status).toBe(200);
      expect(mockUpload).toHaveBeenCalledWith(
        "/config",
        "test.txt",
        expect.any(Buffer),
        "test-server-id",
      );
    });

    test("returns 400 when the server ID is not provided", async () => {
      const res = await request(app)
        .post("/api/files/upload")
        .set("Authorization", `Bearer ${validToken}`)
        .attach("file", Buffer.from("test"), "test.txt")
        .field("targetDir", "/config");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Server ID is required");
    });

    test("handles upload error", async () => {
      mockUpload.mockRejectedValue(new Error("Upload failed"));

      const res = await request(app)
        .post("/api/files/upload")
        .set("Authorization", `Bearer ${validToken}`)
        .attach("file", Buffer.from("test"), "test.txt")
        .field("serverId", "test-server-id");

      expect(res.status).toBe(500);
    });
  });

  describe("GET /api/files/download", () => {
    test("returns 400 without path", async () => {
      const res = await request(app)
        .get("/api/files/download")
        .set("Authorization", `Bearer ${validToken}`);
      expect(res.status).toBe(400);
    });

    test("returns 400 without serverId", async () => {
      const res = await request(app)
        .get("/api/files/download")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ path: "/test.txt" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Server ID required");
    });

    test("downloads file successfully", async () => {
      // Create a temp file to serve
      const tempDir = path.join(os.tmpdir(), "hytale-test-download");
      await fs.mkdir(tempDir, { recursive: true });
      const tempFile = path.join(tempDir, "test.txt");
      await fs.writeFile(tempFile, "test content");

      mockDownload.mockResolvedValue({
        success: true,
        fileName: "test.txt",
        localPath: tempFile,
      });

      const res = await request(app)
        .get("/api/files/download")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ path: "/test.txt", serverId: "test-server-id" });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/octet-stream");

      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    test("returns 404 when file not found", async () => {
      mockDownload.mockResolvedValue({ success: false });

      const res = await request(app)
        .get("/api/files/download")
        .set("Authorization", `Bearer ${validToken}`)
        .query({ path: "/missing", serverId: "test-server-id" });

      expect(res.status).toBe(404);
    });
  });
});
