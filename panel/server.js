const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Docker = require("dockerode");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const CONTAINER_NAME = process.env.CONTAINER_NAME || "hytale-server";
const PORT = process.env.PANEL_PORT || 3000;

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

io.on("connection", async (socket) => {
  console.log("Client connected");

  socket.emit("status", await getContainerStatus());
  socket.emit("files", await checkServerFiles());
  socket.emit("downloader-auth", await checkDownloaderAuth());

  // Stream logs
  try {
    const c = await getContainer();
    if (c) {
      const logStream = await c.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 100,
        timestamps: true,
      });

      logStream.on("data", (chunk) => {
        const text = chunk.slice(8).toString("utf8");
        socket.emit("log", text);
      });

      socket.on("disconnect", () => {
        logStream.destroy();
      });
    }
  } catch (e) {
    socket.emit("error", "Failed to connect to container: " + e.message);
  }

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
