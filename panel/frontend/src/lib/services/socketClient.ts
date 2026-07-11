import { io, type Socket } from 'socket.io-client';
import { get, writable } from 'svelte/store';
import { isAuthenticated } from '$lib/stores/auth';
import { panelConfig } from '$lib/stores/config';
import { clearLogs, hasMoreHistory, initialLoadDone, loadedCount } from '$lib/stores/console';
import { currentPath, fileList } from '$lib/stores/files';
import { installedMods } from '$lib/stores/mods';
import { currentRoute, navigateToDashboard, navigateToServer } from '$lib/stores/router';
import { downloaderAuth, filesReady, isCheckingFiles, serverStatus } from '$lib/stores/server';
import { showToast } from '$lib/stores/ui';
import { registerConsoleEvents } from './socket/consoleEvents';
import { registerDownloadEvents, resetDownloadProgress } from './socket/downloadEvents';
import { registerFilesEvents } from './socket/filesEvents';
import { registerModsEvents } from './socket/modsEvents';
import { registerServerEvents } from './socket/serverEvents';
import { registerUpdateEvents } from './socket/updateEvents';

export const socket = writable<Socket | null>(null);
export const isConnected = writable<boolean>(false);
export const joinedServerId = writable<string | null>(null);

let socketInstance: Socket | null = null;
let routeUnsubscribe: (() => void) | null = null;
let lastJoinedServerId: string | null = null;

export function connectSocket(): Socket {
  if (socketInstance?.connected) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  const config = get(panelConfig);
  const socketPath = config.basePath ? `${config.basePath}/socket.io` : '/socket.io';
  socketInstance = io({
    path: socketPath,
    withCredentials: true
  });

  socketInstance.on('connect', () => {
    isConnected.set(true);
    // If there's a server ID in the URL, join it automatically
    const route = get(currentRoute);
    if (route.serverId) {
      lastJoinedServerId = route.serverId;
      isCheckingFiles.set(true);
      socketInstance?.emit('server:join', route.serverId);
    }
  });

  // Subscribe to route changes for browser back/forward navigation
  if (routeUnsubscribe) routeUnsubscribe();
  routeUnsubscribe = currentRoute.subscribe((route) => {
    if (!socketInstance?.connected) return;

    // Server changed via browser navigation
    if (route.serverId !== lastJoinedServerId) {
      if (lastJoinedServerId && !route.serverId) {
        // Left server, going to dashboard
        socketInstance.emit('server:leave');
        joinedServerId.set(null);
      } else if (route.serverId) {
        // Joined new server
        isCheckingFiles.set(true);
        socketInstance.emit('server:join', route.serverId);
      }
      lastJoinedServerId = route.serverId;
    }
  });

  socketInstance.on('disconnect', () => {
    isConnected.set(false);
    joinedServerId.set(null);
  });

  socketInstance.on('connect_error', (err: Error) => {
    if (err.message === 'Authentication required' || err.message === 'Invalid or expired token') {
      disconnectSocket();
      isAuthenticated.set(false);
      showToast(`Authentication error: ${err.message}. Please login again.`, 'error');
    }
  });

  registerServerEvents(socketInstance);
  registerConsoleEvents(socketInstance);
  registerDownloadEvents(socketInstance);
  registerFilesEvents(socketInstance);
  registerModsEvents(socketInstance);
  registerUpdateEvents(socketInstance);

  socket.set(socketInstance);
  return socketInstance;
}

export function disconnectSocket(): void {
  if (routeUnsubscribe) {
    routeUnsubscribe();
    routeUnsubscribe = null;
  }
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  socket.set(null);
  isConnected.set(false);
  joinedServerId.set(null);
  lastJoinedServerId = null;
}

export function emit(event: string, data?: unknown): void {
  if (socketInstance) {
    socketInstance.emit(event, data);
  }
}

export function joinServer(serverId: string): void {
  if (socketInstance) {
    // Clear ALL previous server data
    clearLogs();
    initialLoadDone.set(false);
    loadedCount.set(0);
    hasMoreHistory.set(true);
    filesReady.set({ hasJar: false, hasAssets: false, ready: false });
    serverStatus.set({ running: false, status: 'offline', startedAt: null });
    installedMods.set([]);
    fileList.set([]);
    currentPath.set('/');
    downloaderAuth.set(false);
    isCheckingFiles.set(true); // Mark as checking until we get response

    resetDownloadProgress();

    socketInstance.emit('server:join', serverId);
    lastJoinedServerId = serverId;
    // Navigate to server URL (this also sets activeServerId via router subscription)
    navigateToServer(serverId);
  }
}

export function leaveServer(): void {
  if (socketInstance) {
    socketInstance.emit('server:leave');
    joinedServerId.set(null);
    lastJoinedServerId = null;
    // Navigate to dashboard (this also sets activeServerId to null via router)
    navigateToDashboard();
  }
}
