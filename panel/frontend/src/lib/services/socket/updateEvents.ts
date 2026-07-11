import type { Socket } from 'socket.io-client';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { updateInfo } from '$lib/stores/server';
import { showToast } from '$lib/stores/ui';

type UpdateCheckResult = {
  success: boolean;
  lastUpdate: string | null;
  daysSinceUpdate: number | null;
  currentVersion?: string | null;
  latestVersion?: string | null;
  updateAvailable?: boolean | null;
  code?: string;
  error?: string;
};

export function registerUpdateEvents(socket: Socket): void {
  socket.on('update:check-result', (result: UpdateCheckResult) => {
    updateInfo.update((u) =>
      result.success
        ? {
            ...u,
            isChecking: false,
            lastUpdate: result.lastUpdate,
            daysSinceUpdate: result.daysSinceUpdate,
            currentVersion: result.currentVersion ?? null,
            latestVersion: result.latestVersion ?? null,
            updateAvailable: result.updateAvailable ?? null
          }
        : {
            ...u,
            isChecking: false
          }
    );

    if (!result.success) {
      const message = result.code === 'CONTAINER_NOT_RUNNING' ? get(_)('downloadRequiresRunningServer') : result.error;
      if (message) {
        showToast(message, result.code === 'CONTAINER_NOT_RUNNING' ? 'warning' : 'error');
      }
    }
  });

  socket.on('update:status', (data: { status: string; message: string }) => {
    updateInfo.update((u) => ({
      ...u,
      updateStatus: data.message,
      isUpdating: data.status !== 'complete' && data.status !== 'error'
    }));

    if (data.status === 'complete') {
      showToast(get(_)('updateComplete'));
      socket.emit('check-files');
      socket.emit('update:check');
    } else if (data.status === 'error') {
      showToast(`${get(_)('updateFailed')}: ${data.message}`, 'error');
    }
  });
}
