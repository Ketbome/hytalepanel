import { writable } from 'svelte/store';
import type { DownloadProgress, FilesReady, ServerStatus } from '$lib/types';

export const serverStatus = writable<ServerStatus>({
  running: false,
  status: 'offline',
  startedAt: null
});

export const filesReady = writable<FilesReady>({
  hasJar: false,
  hasAssets: false,
  ready: false
});

export const downloaderAuth = writable<boolean>(false);

export const downloadProgress = writable<DownloadProgress>({
  active: false,
  status: '',
  percentage: 0,
  step: 'auth',
  authUrl: null,
  authCode: null,
  time: '0s'
});

export interface UpdateInfo {
  lastUpdate: string | null;
  daysSinceUpdate: number | null;
  isChecking: boolean;
  isUpdating: boolean;
  updateStatus: string;
}

export const updateInfo = writable<UpdateInfo>({
  lastUpdate: null,
  daysSinceUpdate: null,
  isChecking: false,
  isUpdating: false,
  updateStatus: ''
});
