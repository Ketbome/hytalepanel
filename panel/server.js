const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Docker = require("dockerode");
const path = require("path");
const multer = require("multer");
const tar = require("tar-stream");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const CONTAINER_NAME = process.env.CONTAINER_NAME || "hytale-server";
const PORT = process.env.PANEL_PORT || 3000;

// File Manager Configuration
const BASE_PATH = "/opt/hytale";
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB
const EDITABLE_EXTENSIONS = [".json", ".yaml", ".yml", ".properties", ".txt", ".cfg", ".conf", ".xml", ".toml", ".ini"];
const UPLOAD_ALLOWED_EXTENSIONS = [".jar", ".zip", ".json", ".yaml", ".yml", ".properties", ".txt", ".cfg", ".conf", ".xml", ".toml", ".ini", ".png", ".jpg"];

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE }
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

let container = null;

async function getContainer() {
  try {
    container = docker.getContainer(CONTAINER_NAME);
    return container;
  } catch (e) {
    return null;
  }
}

async function getContainerStatus() {
  try {
    const c = await getContainer();
    if (!c) return { running: false, status: "not found" };
    const info = await c.inspect();
    return {
      running: info.State.Running,
      status: info.State.Status,
      startedAt: info.State.StartedAt,
      health: info.State.Health?.Status || "unknown",
    };
  } catch (e) {
    return { running: false, status: "not found", error: e.message };
  }
}

async function execCommand(cmd, timeout = 30000) {
  try {
    const c = await getContainer();
    if (!c) throw new Error("Container not found");

    const exec = await c.exec({
      Cmd: ["sh", "-c", cmd],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start();
    return new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => {
        resolve(output || "Command timed out");
      }, timeout);

      stream.on("data", (chunk) => {
        output += chunk.slice(8).toString("utf8");
      });
      stream.on("end", () => {
        clearTimeout(timer);
        resolve(output);
      });
      stream.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  } catch (e) {
    throw e;
  }
}

async function sendServerCommand(cmd) {
  try {
    const c = await getContainer();
    if (!c) throw new Error("Container not found");

    await execCommand(`echo "${cmd}" > /tmp/hytale-console`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function checkServerFiles() {
  try {
    const result = await execCommand(
      'ls -la /opt/hytale/*.jar /opt/hytale/*.zip 2>/dev/null || echo "NO_FILES"'
    );
    const hasJar = result.includes("HytaleServer.jar");
    const hasAssets = result.includes("Assets.zip");
    return { hasJar, hasAssets, ready: hasJar && hasAssets };
  } catch (e) {
    return { hasJar: false, hasAssets: false, ready: false };
  }
}

async function checkDownloaderAuth() {
  try {
    const result = await execCommand(
      'cat /opt/hytale/.hytale-downloader-credentials.json 2>/dev/null || echo "NO_AUTH"'
    );
    return !result.includes("NO_AUTH") && result.includes("access_token");
  } catch (e) {
    return false;
  }
}

// ============================================
// FILE MANAGER FUNCTIONS
// ============================================

// Security: Validate and sanitize paths to prevent traversal attacks
function sanitizePath(requestedPath) {
  const normalized = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.join(BASE_PATH, normalized);
  if (!fullPath.startsWith(BASE_PATH)) {
    throw new Error("Path traversal attempt detected");
  }
  return fullPath;
}

// Get relative path for display
function getRelativePath(fullPath) {
  return fullPath.replace(BASE_PATH, "") || "/";
}

// Validate file extension for upload
function isAllowedUpload(filename) {
  const ext = path.extname(filename).toLowerCase();
  return UPLOAD_ALLOWED_EXTENSIONS.includes(ext);
}

// Check if file is editable (text-based)
function isEditable(filename) {
  const ext = path.extname(filename).toLowerCase();
  return EDITABLE_EXTENSIONS.includes(ext);
}

// Get file icon based on extension
function getFileIcon(filename, isDirectory) {
  if (isDirectory) return "folder";
  const ext = path.extname(filename).toLowerCase();
  const icons = {
    ".jar": "java",
    ".zip": "archive",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".properties": "config",
    ".cfg": "config",
    ".conf": "config",
    ".xml": "config",
    ".toml": "config",
    ".ini": "config",
    ".txt": "text",
    ".log": "log",
    ".png": "image",
    ".jpg": "image"
  };
  return icons[ext] || "file";
}

// List directory contents
async function listDirectory(dirPath) {
  try {
    const safePath = sanitizePath(dirPath);
    const result = await execCommand(
      `ls -la "${safePath}" 2>/dev/null | tail -n +2`,
      10000
    );

    const files = [];
    const lines = result.trim().split("\n").filter(l => l.trim());

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 9) {
        const permissions = parts[0];
        const size = parseInt(parts[4], 10);
        const month = parts[5];
        const day = parts[6];
        const timeOrYear = parts[7];
        const name = parts.slice(8).join(" ");

        if (name === "." || name === "..") continue;

        const isDir = permissions.startsWith("d");
        files.push({
          name,
          isDirectory: isDir,
          size: isDir ? null : size,
          modified: `${month} ${day} ${timeOrYear}`,
          permissions,
          icon: getFileIcon(name, isDir),
          editable: !isDir && isEditable(name)
        });
      }
    }

    // Sort: directories first, then alphabetically
    files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, files, path: dirPath };
  } catch (e) {
    return { success: false, error: e.message, files: [], path: dirPath };
  }
}

// Create directory
async function createDirectory(dirPath) {
  try {
    const safePath = sanitizePath(dirPath);
    await execCommand(`mkdir -p "${safePath}"`, 5000);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Delete file or directory
async function deleteItem(itemPath) {
  try {
    const safePath = sanitizePath(itemPath);
    if (safePath === BASE_PATH) {
      throw new Error("Cannot delete root directory");
    }
    await execCommand(`rm -rf "${safePath}"`, 10000);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Rename/move file or directory
async function renameItem(oldPath, newPath) {
  try {
    const safeOldPath = sanitizePath(oldPath);
    const safeNewPath = sanitizePath(newPath);
    await execCommand(`mv "${safeOldPath}" "${safeNewPath}"`, 5000);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Create backup before editing
async function createBackup(filePath) {
  try {
    const safePath = sanitizePath(filePath);
    const timestamp = Date.now();
    const backupPath = `${safePath}.backup.${timestamp}`;
    await execCommand(`cp "${safePath}" "${backupPath}"`, 5000);
    return { success: true, backupPath: getRelativePath(backupPath) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Read file content using getArchive
async function readFileContent(filePath) {
  try {
    const safePath = sanitizePath(filePath);
    const c = await getContainer();
    if (!c) throw new Error("Container not found");

    if (!isEditable(safePath)) {
      return { success: false, error: "File type not editable", binary: true };
    }

    const stream = await c.getArchive({ path: safePath });

    return new Promise((resolve, reject) => {
      const extract = tar.extract();
      let content = "";

      extract.on("entry", (header, entryStream, next) => {
        const chunks = [];
        entryStream.on("data", chunk => chunks.push(chunk));
        entryStream.on("end", () => {
          content = Buffer.concat(chunks).toString("utf8");
          next();
        });
        entryStream.resume();
      });

      extract.on("finish", () => {
        resolve({ success: true, content, path: filePath });
      });

      extract.on("error", err => {
        reject(err);
      });

      stream.pipe(extract);
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Write file content using putArchive
async function writeFileContent(filePath, content) {
  try {
    const safePath = sanitizePath(filePath);
    const c = await getContainer();
    if (!c) throw new Error("Container not found");

    const pack = tar.pack();
    const fileName = path.basename(safePath);
    const dirPath = path.dirname(safePath);

    pack.entry({ name: fileName }, content);
    pack.finalize();

    await c.putArchive(pack, { path: dirPath });

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Upload file using putArchive
async function uploadFile(targetDir, fileName, fileBuffer) {
  try {
    const safeDirPath = sanitizePath(targetDir);
    const c = await getContainer();
    if (!c) throw new Error("Container not found");

    if (!isAllowedUpload(fileName)) {
      throw new Error("File type not allowed: " + path.extname(fileName));
    }

    const pack = tar.pack();
    pack.entry({ name: fileName }, fileBuffer);
    pack.finalize();

    await c.putArchive(pack, { path: safeDirPath });

    return { success: true, fileName };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Download file (returns tar stream)
async function downloadFile(filePath) {
  try {
    const safePath = sanitizePath(filePath);
    const c = await getContainer();
    if (!c) throw new Error("Container not found");

    const stream = await c.getArchive({ path: safePath });
    return { success: true, stream, fileName: path.basename(safePath) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Download with real-time streaming (shows auth URL when needed)
async function downloadServerFiles(socket) {
  try {
    const c = await getContainer();
    if (!c) throw new Error("Container not found");

    socket.emit("download-status", {
      status: "starting",
      message: "Starting download...",
    });

    // Remove download flag to allow retry
    await execCommand("rm -f /opt/hytale/.download_attempted");

    console.log("Starting hytale-downloader with streaming");

    const exec = await c.exec({
      Cmd: [
        "sh",
        "-c",
        "cd /opt/hytale && hytale-downloader -download-path /tmp/hytale-game.zip 2>&1",
      ],
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    });

    const stream = await exec.start({ Tty: true });

    stream.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      console.log("Download output:", text);

      // Check for auth URL - highlight it
      if (
        text.includes("oauth.accounts.hytale.com") ||
        text.includes("user_code") ||
        text.includes("Authorization code")
      ) {
        socket.emit("download-status", {
          status: "auth-required",
          message: text,
        });
      } else if (text.includes("403") || text.includes("Forbidden")) {
        socket.emit("download-status", {
          status: "error",
          message: "Authentication failed or expired. Try again.",
        });
      } else {
        socket.emit("download-status", { status: "output", message: text });
      }
    });

    stream.on("end", async () => {
      console.log("Download stream ended");

      // Check if zip was created
      const checkZip = await execCommand(
        "ls /tmp/hytale-game.zip 2>/dev/null || echo 'NO_ZIP'"
      );

      if (!checkZip.includes("NO_ZIP")) {
        socket.emit("download-status", {
          status: "extracting",
          message: "Extracting files...",
        });

        await execCommand(
          "unzip -o /tmp/hytale-game.zip -d /tmp/hytale-extract 2>/dev/null || true"
        );
        await execCommand(
          "find /tmp/hytale-extract -name 'HytaleServer.jar' -exec cp {} /opt/hytale/ \\; 2>/dev/null || true"
        );
        await execCommand(
          "find /tmp/hytale-extract -name 'Assets.zip' -exec cp {} /opt/hytale/ \\; 2>/dev/null || true"
        );
        await execCommand("rm -rf /tmp/hytale-game.zip /tmp/hytale-extract");

        socket.emit("download-status", {
          status: "complete",
          message: "Download complete!",
        });
      } else {
        socket.emit("download-status", {
          status: "done",
          message: "Download finished. Check if authentication was completed.",
        });
      }

      socket.emit("files", await checkServerFiles());
      socket.emit("downloader-auth", await checkDownloaderAuth());
    });

    stream.on("error", (err) => {
      console.error("Download stream error:", err);
      socket.emit("download-status", { status: "error", message: err.message });
    });
  } catch (e) {
    console.error("Download error:", e);
    socket.emit("download-status", { status: "error", message: e.message });
  }
}

async function restartContainer() {
  try {
    const c = await getContainer();
    if (!c) throw new Error("Container not found");
    await c.restart();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function stopContainer() {
  try {
    const c = await getContainer();
    if (!c) throw new Error("Container not found");
    await c.stop();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function startContainer() {
  try {
    const c = await getContainer();
    if (!c) throw new Error("Container not found");
    await c.start();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function wipeServerData() {
  try {
    const c = await getContainer();
    if (!c) throw new Error("Container not found");

    // Stop server first if running
    const info = await c.inspect();
    const wasRunning = info.State.Running;

    // Wipe: universe, logs, config, cache, credentials
    await execCommand(
      "rm -rf /opt/hytale/universe/* /opt/hytale/logs/* /opt/hytale/config/* /opt/hytale/.cache/* /opt/hytale/.download_attempted /opt/hytale/.hytale-downloader-credentials.json 2>/dev/null || true"
    );

    return { success: true, wasRunning };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================
// HTTP ENDPOINTS FOR FILE MANAGER
// ============================================

// File upload endpoint
app.post("/api/files/upload", upload.single("file"), async (req, res) => {
  try {
    const { targetDir } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: "No file provided" });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return res.status(413).json({ success: false, error: "File too large (max 100MB)" });
    }

    const result = await uploadFile(
      targetDir || "/",
      file.originalname,
      file.buffer
    );

    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// File download endpoint
app.get("/api/files/download", async (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ success: false, error: "Path required" });
    }

    const result = await downloadFile(filePath);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}.tar"`);
    res.setHeader("Content-Type", "application/x-tar");

    result.stream.pipe(res);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

io.on("connection", async (socket) => {
  console.log("Client connected");

  socket.emit("status", await getContainerStatus());
  socket.emit("files", await checkServerFiles());
  socket.emit("downloader-auth", await checkDownloaderAuth());

  // Log streaming with reconnect support
  let logStream = null;

  async function connectLogStream(tail = 100) {
    // Destroy old stream if exists
    if (logStream) {
      try {
        logStream.destroy();
      } catch (e) {
        // ignore
      }
      logStream = null;
    }

    try {
      const c = await getContainer();
      if (c) {
        logStream = await c.logs({
          follow: true,
          stdout: true,
          stderr: true,
          tail,
          timestamps: true,
        });

        logStream.on("data", (chunk) => {
          const text = chunk.slice(8).toString("utf8");
          socket.emit("log", text);
        });

        logStream.on("error", () => {
          // Stream ended, will reconnect on next action
          logStream = null;
        });

        logStream.on("end", () => {
          logStream = null;
        });
      }
    } catch (e) {
      socket.emit("error", "Failed to connect to container logs: " + e.message);
    }
  }

  // Initial log connection
  await connectLogStream();

  socket.on("disconnect", () => {
    if (logStream) {
      try {
        logStream.destroy();
      } catch (e) {
        // ignore
      }
    }
  });

  socket.on("command", async (cmd) => {
    const result = await sendServerCommand(cmd);
    socket.emit("command-result", { cmd, ...result });
  });

  socket.on("download", async () => {
    await downloadServerFiles(socket);
  });

  socket.on("restart", async () => {
    socket.emit("action-status", { action: "restart", status: "starting" });
    const result = await restartContainer();
    socket.emit("action-status", { action: "restart", ...result });
    // Reconnect to logs after restart
    if (result.success) {
      setTimeout(async () => {
        await connectLogStream(50);
        socket.emit("status", await getContainerStatus());
      }, 2000);
    }
  });

  socket.on("stop", async () => {
    socket.emit("action-status", { action: "stop", status: "starting" });
    const result = await stopContainer();
    socket.emit("action-status", { action: "stop", ...result });
  });

  socket.on("start", async () => {
    socket.emit("action-status", { action: "start", status: "starting" });
    const result = await startContainer();
    socket.emit("action-status", { action: "start", ...result });
    // Connect to logs after start
    if (result.success) {
      setTimeout(async () => {
        await connectLogStream(50);
        socket.emit("status", await getContainerStatus());
      }, 2000);
    }
  });

  socket.on("check-files", async () => {
    socket.emit("files", await checkServerFiles());
    socket.emit("downloader-auth", await checkDownloaderAuth());
  });

  socket.on("wipe", async () => {
    socket.emit("action-status", { action: "wipe", status: "starting" });
    const result = await wipeServerData();
    socket.emit("action-status", { action: "wipe", ...result });
    socket.emit("downloader-auth", await checkDownloaderAuth());
  });

  // ============================================
  // FILE MANAGER SOCKET.IO HANDLERS
  // ============================================

  // List directory
  socket.on("files:list", async (dirPath = "/") => {
    const result = await listDirectory(dirPath);
    socket.emit("files:list-result", result);
  });

  // Read file content
  socket.on("files:read", async (filePath) => {
    const result = await readFileContent(filePath);
    socket.emit("files:read-result", result);
  });

  // Save file content
  socket.on("files:save", async ({ path: filePath, content, createBackup: shouldBackup }) => {
    let backupResult = null;
    if (shouldBackup) {
      backupResult = await createBackup(filePath);
    }
    const result = await writeFileContent(filePath, content);
    socket.emit("files:save-result", { ...result, backup: backupResult });
  });

  // Create directory
  socket.on("files:mkdir", async (dirPath) => {
    const result = await createDirectory(dirPath);
    socket.emit("files:mkdir-result", result);
  });

  // Delete item
  socket.on("files:delete", async (itemPath) => {
    const result = await deleteItem(itemPath);
    socket.emit("files:delete-result", result);
  });

  // Rename item
  socket.on("files:rename", async ({ oldPath, newPath }) => {
    const result = await renameItem(oldPath, newPath);
    socket.emit("files:rename-result", result);
  });

  const statusInterval = setInterval(async () => {
    socket.emit("status", await getContainerStatus());
  }, 5000);

  socket.on("disconnect", () => {
    clearInterval(statusInterval);
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Hytale Panel running on http://localhost:${PORT}`);
});
