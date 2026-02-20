import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express, { type Router } from 'express';
import { Server } from 'socket.io';

import fs from 'node:fs';
import config from './config/index.js';
import { socketAuth } from './middleware/auth.js';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js';
import { setupSocketHandlers } from './socket/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Socket.IO with configurable path
const basePath = config.server.basePath;
const socketPath = basePath ? `${basePath}/socket.io` : '/socket.io';
const io = new Server(server, { path: socketPath });

app.use(express.json());
app.use(cookieParser());

// Create router for all panel routes
const panelRouter = express.Router() as Router;

// Expose config for frontend (base path, auth status)
panelRouter.get('/panel-config', (_req, res) => {
  res.json({
    basePath: config.server.basePath,
    authDisabled: config.auth.disabled
  });
});

panelRouter.use('/auth', authRoutes);
panelRouter.use('/api', apiRoutes);

// Serve built frontend in production only if build exists
if (process.env.NODE_ENV === 'production') {
  const publicDist = path.join(__dirname, '../../public-dist');
  const indexFile = path.join(publicDist, 'index.html');

  if (fs.existsSync(indexFile)) {
    panelRouter.use(express.static(publicDist));
    // SPA fallback - serve index.html for all non-API routes
    panelRouter.use((req, res, next) => {
      if (req.method === 'GET' && req.accepts('html')) {
        res.setHeader('Content-Type', 'text/html');
        res.sendFile(indexFile);
      } else {
        next();
      }
    });
  } else {
    console.warn('Warning: production build not found at', indexFile);
    console.warn('The panel will not serve frontend assets; start the frontend dev server or build the frontend.');
  }
}

// Mount panel router at base path (or root if no base path)
if (basePath) {
  app.use(basePath, panelRouter);
  // Redirect root to base path in production
  if (process.env.NODE_ENV === 'production') {
    app.get('/', (_req, res) => res.redirect(basePath));
  }
} else {
  app.use('/', panelRouter);
}

io.use(socketAuth);
setupSocketHandlers(io);

if (config.auth.username === 'admin' && config.auth.password === 'admin') {
  console.warn('\n⚠️  WARNING: Using default credentials!');
  console.warn('   Set PANEL_USER and PANEL_PASS environment variables.\n');
}

server.listen(config.server.port, () => {
  console.log(`Hytale Panel backend running on port ${config.server.port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Dev mode: access via http://localhost:5173');
  } else {
    console.log(`Production: http://localhost:${config.server.port}`);
  }
});
