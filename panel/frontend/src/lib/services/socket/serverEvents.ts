import type { Socket } from 'socket.io-client';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { addLog } from '$lib/stores/console';
import {
  downloaderAuth,
  filesReady,
  isCheckingFiles,
  pendingAction,
  serverStatus,
  setPendingAction
} from '$lib/stores/server';
import type { Server } from '$lib/stores/servers';
import { activeServerId, servers, updateServerStatus } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import type { ActionStatus, CommandResult, FilesReady, ServerStatus } from '$lib/types';
import { joinedServerId } from '../socketClient';

export function registerServerEvents(socket: Socket): void {
  socket.on('server:joined', ({ serverId, server }: { serverId: string; server?: Server }) => {
    joinedServerId.set(serverId);
    setPendingAction(null);
    // Update servers store with fresh data from backend
    if (server) {
      servers.update((list) => {
        const idx = list.findIndex((s) => s.id === serverId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...server };
          return [...list];
        }
        return [...list, server];
      });
    }
    // Request file list - always available via local filesystem
    socket.emit('files:list', '/');
  });

  socket.on('server:join-error', ({ error }: { error: string }) => {
    showToast(`Error: ${error}`, 'error');
  });

  socket.on('status', (s: ServerStatus) => {
    const wasRunning = get(serverStatus).running;
    const isNowRunning = s.running;

    serverStatus.set({
      running: isNowRunning,
      status: s.status || 'unknown',
      startedAt: s.startedAt
    });

    // Docker caught up with the action the user started
    const pending = get(pendingAction);
    if ((pending === 'starting' && isNowRunning) || (pending === 'stopping' && !isNowRunning)) {
      setPendingAction(null);
    }

    const serverId = get(activeServerId);
    if (serverId) {
      updateServerStatus(serverId, isNowRunning ? 'running' : 'stopped');
    }

    if (isNowRunning && !wasRunning) {
      socket.emit('files:list', '/');
      socket.emit('mods:list');
    }
  });

  socket.on('files', (f: FilesReady) => {
    filesReady.set({
      hasJar: f.hasJar,
      hasAssets: f.hasAssets,
      ready: f.ready
    });
    isCheckingFiles.set(false);
    socket.emit('mods:check-config');
    socket.emit('cf:check-config');
  });

  socket.on('downloader-auth', (a: boolean) => {
    downloaderAuth.set(a);
    isCheckingFiles.set(false);
  });

  socket.on('command-result', (r: CommandResult) => {
    if (r.error) {
      if (get(pendingAction) === 'stopping') setPendingAction(null);
      addLog(`Error: ${r.error}`, 'error');
      showToast(get(_)('failed'), 'error');
    }
  });

  socket.on('action-status', (s: ActionStatus) => {
    const t = get(_);
    const actionLabels: Record<string, string> = {
      restart: t('restart'),
      stop: t('stop'),
      start: t('start'),
      wipe: t('wipeData'),
      kill: t('forceStop')
    };
    // The server header already shows Starting / Stopping / Online: only the wipe result needs a toast
    if (s.success) {
      if (s.action === 'restart') setPendingAction(null);
      if (s.action === 'wipe') showToast(t('dataWiped'));
    } else if (s.error) {
      setPendingAction(null);
      showToast(`${actionLabels[s.action] || s.action}: ${t('failed')}`, 'error');
    }
  });

  socket.on('error', (m: string) => {
    addLog(m, 'error');
    showToast(m, 'error');
  });
}
