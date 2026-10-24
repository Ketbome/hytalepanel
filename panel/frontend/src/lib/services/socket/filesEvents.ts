import type { Socket } from 'socket.io-client';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import {
  currentPath,
  fileList,
  filesError,
  isFilesLoading,
  setEditorContent,
  setEditorStatus
} from '$lib/stores/files';
import { showToast } from '$lib/stores/ui';
import type { FileListResult, FileOperationResult, FileReadResult, FileSaveResult } from '$lib/types';

export function registerFilesEvents(socket: Socket): void {
  socket.on('files:list-result', (result: FileListResult) => {
    isFilesLoading.set(false);
    if (result.success) {
      filesError.set(null);
      currentPath.set(result.path);
      fileList.set(result.files);
    } else {
      // Shown inside the file list, not as a toast
      filesError.set(result.error || get(_)('error'));
      fileList.set([]);
    }
  });

  socket.on('files:read-result', (result: FileReadResult) => {
    const t = get(_);
    if (result.success && result.content !== undefined) {
      setEditorContent(result.content);
    } else if (result.binary) {
      setEditorStatus(t('cannotEditBinary'), 'error');
    } else {
      setEditorStatus(`${t('error')}: ${result.error}`, 'error');
    }
  });

  socket.on('files:save-result', (result: FileSaveResult) => {
    const t = get(_);
    if (result.success) {
      setEditorStatus(result.backup?.success ? t('savedWithBackup') : t('saved'), 'saved');
      showToast(t('fileSaved'));
    } else {
      setEditorStatus(`${t('error')}: ${result.error}`, 'error');
      showToast(t('saveFailed'), 'error');
    }
  });

  const refreshOps: Array<[string, string]> = [
    ['files:mkdir-result', 'folderCreated'],
    ['files:delete-result', 'deleted'],
    ['files:rename-result', 'renamed']
  ];

  for (const [event, messageKey] of refreshOps) {
    socket.on(event, (result: FileOperationResult) => {
      const t = get(_);
      if (result.success) {
        showToast(t(messageKey));
        socket.emit('files:list', get(currentPath));
      } else {
        showToast(`${t('error')}: ${result.error}`, 'error');
      }
    });
  }
}
