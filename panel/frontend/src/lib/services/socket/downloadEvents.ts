import type { Socket } from 'socket.io-client';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { addLog } from '$lib/stores/console';
import { downloadProgress } from '$lib/stores/server';
import { activeServerId } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import type { DownloadStatusEvent } from '$lib/types';

let dlStartTime: number | null = null;
let dlTimer: ReturnType<typeof setInterval> | null = null;

function formatSec(s: number): string {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function startDlTimer(): void {
  stopDlTimer();
  dlTimer = setInterval(() => {
    if (dlStartTime) {
      const elapsed = Math.floor((Date.now() - dlStartTime) / 1000);
      downloadProgress.update((p) => ({ ...p, time: formatSec(elapsed) }));
    }
  }, 1000);
}

function stopDlTimer(): void {
  if (dlTimer) {
    clearInterval(dlTimer);
    dlTimer = null;
  }
}

export function resetDownloadProgress(): void {
  stopDlTimer();
  downloadProgress.set({
    active: false,
    status: '',
    percentage: 0,
    step: 'auth',
    authUrl: null,
    authCode: null,
    time: '0s'
  });
}

function handleDownloadStatus(d: DownloadStatusEvent & { serverId?: string }): void {
  // Ignore events from other servers
  const currentServerId = get(activeServerId);
  if (d.serverId && d.serverId !== currentServerId) {
    console.log('[Download] Ignoring event for different server:', d.serverId, 'current:', currentServerId);
    return;
  }

  console.log('[Download] Status:', d.status, 'Message:', d.message);
  switch (d.status) {
    case 'starting':
      dlStartTime = Date.now();
      startDlTimer();
      downloadProgress.set({
        active: true,
        status: get(_)('starting'),
        percentage: 5,
        step: 'auth',
        authUrl: null,
        authCode: null,
        time: '0s'
      });
      break;

    case 'auth-required':
      if (d.message) {
        addLog(d.message, 'auth');
        const urlRegex = /https:\/\/oauth\.accounts\.hytale\.com\S+/;
        const codeRegex = /(?:user_code[=:]\s*|code:\s*)([\w]+)/i;
        const url = urlRegex.exec(d.message);
        const code = codeRegex.exec(d.message);
        downloadProgress.update((p) => ({
          ...p,
          status: get(_)('waitingAuth'),
          percentage: 10,
          authUrl: url ? url[0] : null,
          authCode: code ? code[1] : null
        }));
      }
      break;

    case 'output':
      if (d.message) {
        addLog(d.message);
        if (d.message.toLowerCase().includes('download')) {
          downloadProgress.update((p) => ({
            ...p,
            status: get(_)('downloading'),
            percentage: 30,
            step: 'download'
          }));
        }
        const pMatch = d.message.match(/(\d+)\.?\d*%/);
        if (pMatch) {
          const percent = Number.parseFloat(pMatch[0]);
          downloadProgress.update((p) => ({
            ...p,
            status: `${Math.round(percent)}%`,
            percentage: 30 + percent * 0.5
          }));
        }
      }
      break;

    case 'extracting':
      if (d.message) addLog(d.message, 'info');
      downloadProgress.update((p) => ({
        ...p,
        status: get(_)('extracting'),
        percentage: 85,
        step: 'extract'
      }));
      break;

    case 'complete':
      stopDlTimer();
      downloadProgress.update((p) => ({
        ...p,
        active: false,
        status: get(_)('done'),
        percentage: 100,
        step: 'complete',
        authUrl: null,
        authCode: null
      }));
      showToast(get(_)('downloadComplete'));
      addLog(get(_)('filesReadyMsg'), 'info');
      break;

    case 'done':
    case 'error':
      stopDlTimer();
      if (d.status === 'error') {
        downloadProgress.update((p) => ({
          ...p,
          status: get(_)('error'),
          active: false
        }));
        if (d.code === 'CONTAINER_NOT_RUNNING') {
          const message = get(_)('downloadRequiresRunningServer');
          showToast(message, 'warning');
          addLog(message, 'warn');
        } else if (d.message) {
          showToast(d.message, 'error');
          addLog(`${get(_)('error')}: ${d.message}`, 'error');
        }
      } else {
        downloadProgress.update((p) => ({ ...p, active: false }));
      }
      break;
  }
}

export function registerDownloadEvents(socket: Socket): void {
  socket.on('download-status', handleDownloadStatus);
}
