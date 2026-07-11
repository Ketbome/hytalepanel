import type { Socket } from 'socket.io-client';
import { get } from 'svelte/store';
import { currentPath, fileList, isFilesLoading, setEditorContent, setEditorStatus } from '$lib/stores/files';
import { showToast } from '$lib/stores/ui';
import type { FileListResult, FileOperationResult, FileReadResult, FileSaveResult } from '$lib/types';

export function registerFilesEvents(socket: Socket): void {
  socket.on('files:list-result', (result: FileListResult) => {
    isFilesLoading.set(false);
    if (result.success) {
      currentPath.set(result.path);
      fileList.set(result.files);
    } else {
      showToast(`Error: ${result.error}`, 'error');
      fileList.set([]);
    }
  });

  socket.on('files:read-result', (result: FileReadResult) => {
    if (result.success && result.content !== undefined) {
      setEditorContent(result.content);
    } else if (result.binary) {
      setEditorStatus('Cannot edit binary file', 'error');
    } else {
      setEditorStatus(`Error: ${result.error}`, 'error');
    }
  });

  socket.on('files:save-result', (result: FileSaveResult) => {
    if (result.success) {
      setEditorStatus(result.backup?.success ? 'Saved (backup created)' : 'Saved', 'saved');
      showToast('File saved');
    } else {
      setEditorStatus(`Error: ${result.error}`, 'error');
      showToast('Save failed', 'error');
    }
  });

  const refreshOps: Array<[string, string]> = [
    ['files:mkdir-result', 'Folder created'],
    ['files:delete-result', 'Deleted'],
    ['files:rename-result', 'Renamed']
  ];

  for (const [event, message] of refreshOps) {
    socket.on(event, (result: FileOperationResult) => {
      if (result.success) {
        showToast(message);
        socket.emit('files:list', get(currentPath));
      } else {
        showToast(`Error: ${result.error}`, 'error');
      }
    });
  }
}
