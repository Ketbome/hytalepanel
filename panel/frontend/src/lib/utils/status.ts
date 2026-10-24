import type { Server } from '$lib/stores/servers';
import type { ServerStatus } from '$lib/types';

export type UiStatus = 'online' | 'offline' | 'starting' | 'stopping' | 'unknown';
export type PendingAction = 'starting' | 'stopping' | null;

// The socket reports Docker's container state; map it onto the four words the UI uses
export function workspaceStatus(status: ServerStatus, pending: PendingAction): UiStatus {
  if (pending) return pending;
  const raw = String(status.status);
  if (raw === 'restarting' || raw === 'starting') return 'starting';
  if (raw === 'removing' || raw === 'stopping') return 'stopping';
  if (status.running) return 'online';
  if (raw === 'unknown') return 'unknown';
  return 'offline';
}

export function listStatus(server: Server, pending?: PendingAction): UiStatus {
  if (pending) return pending;
  if (server.status === 'running') return 'online';
  if (server.status === 'stopped') return 'offline';
  return 'unknown';
}
