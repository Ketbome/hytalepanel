import { apiUrl } from '$lib/stores/config';
import type { Server, ServerConfig } from '$lib/stores/servers';

export interface UploadResponse {
  success: boolean;
  uploadedCount?: number;
  failedCount?: number;
  errors?: string[];
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

export interface UploadFileItem {
  file: File;
  relativePath?: string;
}

export async function uploadFiles(
  files: UploadFileItem[],
  targetDir: string,
  serverId: string,
  _onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  for (const item of files) {
    formData.append('files', item.file);
    formData.append('relativePaths', item.relativePath || item.file.name);
  }
  formData.append('targetDir', targetDir);
  formData.append('serverId', serverId);

  const response = await fetch(apiUrl('/api/files/upload'), {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  return await response.json();
}

export async function downloadFile(filePath: string, serverId: string): Promise<OperationResponse> {
  try {
    const response = await fetch(
      apiUrl(`/api/files/download?path=${encodeURIComponent(filePath)}&serverId=${encodeURIComponent(serverId)}`),
      {
        credentials: 'include'
      }
    );

    if (!response.ok) {
      const errorResponse = (await response.json()) as UploadResponse;
      return { success: false, error: errorResponse.error || 'Download failed' };
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
    const filename = filenameMatch?.[1] || 'download.bin';
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ==================== SERVERS API ====================

export async function fetchServers(): Promise<ServersResponse> {
  try {
    const response = await fetch(apiUrl('/api/servers'), {
      credentials: 'include'
    });
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
      credentials: 'include',
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
      credentials: 'include',
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
      method: 'DELETE',
      credentials: 'include'
    });
    return await response.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function startServer(id: string): Promise<OperationResponse> {
  try {
    const response = await fetch(apiUrl(`/api/servers/${id}/start`), {
      method: 'POST',
      credentials: 'include'
    });
    return await response.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function stopServer(id: string): Promise<OperationResponse> {
  try {
    const response = await fetch(apiUrl(`/api/servers/${id}/stop`), {
      method: 'POST',
      credentials: 'include'
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
    const response = await fetch(apiUrl(`/api/servers/${serverId}/channels`), {
      credentials: 'include'
    });
    return await response.json();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
