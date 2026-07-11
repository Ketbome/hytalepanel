import { writable } from 'svelte/store';

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  message: string;
  resolve: ((confirmed: boolean) => void) | null;
}

export const confirmState = writable<ConfirmState>({
  open: false,
  message: '',
  resolve: null
});

export function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState.set({
      open: true,
      message,
      resolve,
      ...options
    });
  });
}

export function resolveConfirm(confirmed: boolean): void {
  confirmState.update((state) => {
    state.resolve?.(confirmed);
    return { open: false, message: '', resolve: null };
  });
}
