import { writable } from 'svelte/store';
import type { EditorState, FileEntry, UploadState } from '$lib/types';

export const currentPath = writable<string>('/');
export const fileList = writable<FileEntry[]>([]);
export const isFilesLoading = writable<boolean>(false);

export const editorState = writable<EditorState>({
  isOpen: false,
  filePath: null,
  content: '',
  status: 'ready',
  statusClass: ''
});

export const uploadState = writable<UploadState>({
  isVisible: false,
  isUploading: false,
  progress: 0,
  text: ''
});

export function openEditor(filePath: string): void {
  editorState.set({
    isOpen: true,
    filePath,
    content: '',
    status: 'loading',
    statusClass: ''
  });
}

export function closeEditor(): void {
  editorState.set({
    isOpen: false,
    filePath: null,
    content: '',
    status: 'ready',
    statusClass: ''
  });
}

export function setEditorContent(content: string): void {
  editorState.update((s) => ({
    ...s,
    content,
    status: 'ready',
    statusClass: ''
  }));
}

export function setEditorStatus(status: string, statusClass = ''): void {
  editorState.update((s) => ({ ...s, status, statusClass }));
}
