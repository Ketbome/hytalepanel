import { apiUrl } from '$lib/stores/config';
import type { Server, ServerConfig } from '$lib/stores/servers';

export interface UploadResponse {
  success: boolean;
  error?: string;
}

export interface ServersResponse {
  success: boolean;
  servers?: Server[];
  error?: string;
}

export interface ServerResponse {
  success: boolean;
  server?: Server;
  error?: string;
}

export interface OperationResponse {
  success: boolean;
  error?: string;
}

export async function uploadFile(
  file: File,
  targetDir: string,
  serverId: string,
  _onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('targetDir', targetDir);
  formData.append('serverId', serverId);

  const response = await fetch(apiUrl('/api/files/upload'), {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  return await response.json();
}

// ==================== SERVERS API ====================

export async function fetchServers(): Promise<ServersResponse> {
  try {
    const response = await fetch(apiUrl('/api/servers'));
    return await response.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface CreateServerParams {
  name: string;
  port?: number;
  config?: Partial<ServerConfig>;
}

export async function createServer(params: CreateServerParams): Promise<ServerResponse> {
  try {
    const response = await fetch(apiUrl('/api/servers'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await response.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateServer(id: string, params: Partial<CreateServerParams>): Promise<ServerResponse> {
  try {
    const response = await fetch(apiUrl(`/api/servers/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await response.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteServer(id: string): Promise<OperationResponse> {
  try {
    const response = await fetch(apiUrl(`/api/servers/${id}`), {
      method: 'DELETE'
    });
    return await response.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function startServer(id: string): Promise<OperationResponse> {
  try {
    const response = await fetch(apiUrl(`/api/servers/${id}/start`), {
      method: 'POST'
    });
    return await response.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function stopServer(id: string): Promise<OperationResponse> {
  try {
    const response = await fetch(apiUrl(`/api/servers/${id}/stop`), {
      method: 'POST'
    });
    return await response.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ==================== RELEASE CHANNELS API ====================

export interface Channel {
  id: 'stable' | 'pre-release';
  name: string;
  description: string;
  recommended: boolean;
  available: boolean;
}

export interface ChannelsResponse {
  success: boolean;
  channels?: Channel[];
  current?: 'stable' | 'pre-release';
  error?: string;
}

export async function fetchChannels(serverId: string): Promise<ChannelsResponse> {
  try {
    const response = await fetch(apiUrl(`/api/servers/${serverId}/channels`));
    return await response.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
