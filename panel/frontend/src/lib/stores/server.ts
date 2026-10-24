import { writable } from 'svelte/store';
import type { DownloadProgress, FilesReady, ServerStatus } from '$lib/types';
import type { PendingAction } from '$lib/utils/status';

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

// A lifecycle action the user started that Docker hasn't reported back yet
export const pendingAction = writable<PendingAction>(null);
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

export function setPendingAction(action: PendingAction): void {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = action ? setTimeout(() => pendingAction.set(null), 90000) : null;
  pendingAction.set(action);
}

export const downloaderAuth = writable<boolean>(false);

export const isCheckingFiles = writable<boolean>(false);

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
  currentVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean | null;
  isChecking: boolean;
  isUpdating: boolean;
  updateStatus: string;
}

export const updateInfo = writable<UpdateInfo>({
  lastUpdate: null,
  daysSinceUpdate: null,
  currentVersion: null,
  latestVersion: null,
  updateAvailable: null,
  isChecking: false,
  isUpdating: false,
  updateStatus: ''
});
