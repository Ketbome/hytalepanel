import { writable } from 'svelte/store';
import type { TabId, Toast, ToastType } from '$lib/types';

export const activeTab = writable<TabId>('control');
export const sidebarHidden = writable<boolean>(false);
export const panelExpanded = writable<boolean>(false);
export const toasts = writable<Toast[]>([]);

let toastId = 0;

const TOAST_MAX_LENGTH = 220;

export function showToast(message: string, type: ToastType = ''): void {
  const id = ++toastId;
  const text = message.length > TOAST_MAX_LENGTH ? `${message.slice(0, TOAST_MAX_LENGTH)}…` : message;
  toasts.update((t) => [...t, { id, message: text, type }]);

  setTimeout(() => {
    toasts.update((t) => t.filter((toast) => toast.id !== id));
  }, 4000);
}
