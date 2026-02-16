import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import config from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import * as docker from '../services/docker.js';
import * as files from '../services/files.js';
import * as machineId from '../services/machineId.js';
import * as servers from '../services/servers.js';

const router: RouterType = Router();

router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.files.maxUploadSize }
});

// ==================== SERVERS API ====================

router.get('/servers', async (_req, res) => {
  try {
    const result = await servers.listServers();

    if (result.success && result.servers) {
      // Enrich with container status
      const enriched = await Promise.all(
        result.servers.map(async (server) => {
          const status = await docker.getStatus(server.containerName);
          return { ...server, status: status.running ? 'running' : 'stopped' };
        })
      );
      res.json({ success: true, servers: enriched });
    } else {
      res.json(result);
    }
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/servers', async (req, res) => {
  try {
    const {
      name,
      port,
      config: serverConfig
    } = req.body as {
      name: string;
      port?: number;
      config?: Partial<servers.ServerConfig>;
    };

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    const result = await servers.createServer({
      name: name.trim(),
      port,
      config: serverConfig
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.get('/servers/:id', async (req, res) => {
  try {
    const result = await servers.getServer(req.params.id);

    if (result.success && result.server) {
      const status = await docker.getStatus(result.server.containerName);
      res.json({
        success: true,
        server: {
          ...result.server,
          status: status.running ? 'running' : 'stopped'
        }
      });
    } else {
      res.status(404).json(result);
    }
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.put('/servers/:id', async (req, res) => {
  try {
    const {
      name,
      port,
      config: serverConfig
    } = req.body as {
      name?: string;
      port?: number;
      config?: Partial<servers.ServerConfig>;
    };

    const result = await servers.updateServer(req.params.id, {
      name,
      port,
      config: serverConfig
    });

    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.delete('/servers/:id', async (req, res) => {
  try {
    const result = await servers.deleteServer(req.params.id, true);

    if (!result.success) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/servers/:id/start', async (req, res) => {
  try {
    const result = await servers.startServer(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/servers/:id/stop', async (req, res) => {
  try {
    const result = await servers.stopServer(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/servers/:id/restart', async (req, res) => {
  try {
    const result = await servers.restartServer(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// Docker Compose management
router.get('/servers/:id/compose', async (req, res) => {
  try {
    const result = await servers.getServerCompose(req.params.id);
    if (!result.success) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.put('/servers/:id/compose', async (req, res) => {
  try {
    const { content } = req.body as { content: string };
    if (!content) {
      res.status(400).json({ success: false, error: 'Content is required' });
      return;
    }
    const result = await servers.saveServerCompose(req.params.id, content);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/servers/:id/compose/regenerate', async (req, res) => {
  try {
    const result = await servers.regenerateServerCompose(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// ==================== MACHINE-ID API ====================

router.get('/servers/:id/machine-id', async (req, res) => {
  try {
    const serverResult = await servers.getServer(req.params.id);
    if (!serverResult.success || !serverResult.server) {
      res.status(404).json({ success: false, error: 'Server not found' });
      return;
    }
    const result = await machineId.checkMachineId(serverResult.server.containerName);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/servers/:id/machine-id/regenerate', async (req, res) => {
  try {
    const serverResult = await servers.getServer(req.params.id);
    if (!serverResult.success || !serverResult.server) {
      res.status(404).json({ success: false, error: 'Server not found' });
      return;
    }
    const result = await machineId.regenerateMachineId(serverResult.server.containerName);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// ==================== FILES API ====================

router.post('/files/upload', upload.single('file'), async (req, res) => {
  try {
    const { targetDir, serverId } = req.body as {
      targetDir?: string;
      serverId: string;
    };
    const file = req.file;

    if (!serverId) {
      res.status(400).json({ success: false, error: 'Server ID is required' });
      return;
    }

    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    if (file.size > config.files.maxUploadSize) {
      res.status(413).json({ success: false, error: 'File too large (max 500MB)' });
      return;
    }

    const result = await files.upload(targetDir || '/', file.originalname, file.buffer, serverId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.get('/files/download', async (req, res) => {
  try {
    const { path: filePath, serverId } = req.query as {
      path?: string;
      serverId?: string;
    };

    if (!filePath) {
      res.status(400).json({ success: false, error: 'Path required' });
      return;
    }

    if (!serverId) {
      res.status(400).json({ success: false, error: 'Server ID required' });
      return;
    }

    const result = await files.download(filePath, serverId);

    if (!result.success || !result.localPath) {
      res.status(404).json(result);
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const { createReadStream } = await import('node:fs');
    const stream = createReadStream(result.localPath);
    stream.pipe(res);
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

export default router;
