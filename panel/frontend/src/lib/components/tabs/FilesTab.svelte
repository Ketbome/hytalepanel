<script lang="ts">
import { tick } from 'svelte';
import { _ } from 'svelte-i18n';
import Skeleton from '$lib/components/ui/Skeleton.svelte';
import { downloadFile, type UploadFileItem, uploadFiles } from '$lib/services/api';
import { emit } from '$lib/services/socketClient';
import {
  closeEditor,
  currentPath,
  editorState,
  FILE_ICONS,
  fileList,
  isFilesLoading,
  openEditor,
  setEditorStatus,
  uploadState
} from '$lib/stores/files';
import { activeServer } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import type { FileEntry } from '$lib/types';
import { formatSize } from '$lib/utils/formatters';

let fileInput: HTMLInputElement | undefined = $state();
let folderInput: HTMLInputElement | undefined = $state();
let editorContent = $state('');
let createBackup = $state(true);
let searchQuery = $state('');
const supportsDirectoryUpload = typeof window !== 'undefined' && 'webkitdirectory' in HTMLInputElement.prototype;

interface BreadcrumbPart {
  path: string;
  label: string;
}

function getBreadcrumbParts(path: string): BreadcrumbPart[] {
  const parts = path.split('/').filter((p) => p);
  let accumulated = '';
  const result: BreadcrumbPart[] = [{ path: '/', label: 'server' }];
  for (const part of parts) {
    accumulated += `/${part}`;
    result.push({ path: accumulated, label: part });
  }
  return result;
}

const breadcrumbParts = $derived(getBreadcrumbParts($currentPath));

const filteredFiles = $derived(() => {
  if (!searchQuery.trim()) return $fileList;
  const lower = searchQuery.toLowerCase();
  return $fileList.filter((file) => file.name.toLowerCase().includes(lower));
});

$effect(() => {
  editorContent = $editorState.content;
});

function navigateTo(path: string): void {
  isFilesLoading.set(true);
  emit('files:list', path);
}

function goBack(): void {
  const parts = $currentPath.split('/').filter((p) => p);
  parts.pop();
  navigateTo(parts.length ? `/${parts.join('/')}` : '/');
}

function handleFileClick(file: FileEntry): void {
  if (file.isDirectory) {
    const newPath = $currentPath === '/' ? `/${file.name}` : `${$currentPath}/${file.name}`;
    navigateTo(newPath);
  }
}

function handleFileDoubleClick(file: FileEntry): void {
  if (!file.isDirectory) {
    const filePath = $currentPath === '/' ? `/${file.name}` : `${$currentPath}/${file.name}`;
    openEditor(filePath);
    emit('files:read', filePath);
  }
}

function handleEdit(file: FileEntry): void {
  const filePath = $currentPath === '/' ? `/${file.name}` : `${$currentPath}/${file.name}`;
  openEditor(filePath);
  emit('files:read', filePath);
}

function handleDelete(file: FileEntry): void {
  if (confirm(`${$_('confirmDelete')} "${file.name}"?`)) {
    const filePath = $currentPath === '/' ? `/${file.name}` : `${$currentPath}/${file.name}`;
    emit('files:delete', filePath);
  }
}

function handleNewFolder(): void {
  const name = prompt($_('folderName'));
  if (name) {
    const folderPath = $currentPath === '/' ? `/${name}` : `${$currentPath}/${name}`;
    emit('files:mkdir', folderPath);
  }
}

function toggleUploadZone(): void {
  uploadState.update((s) => ({ ...s, isVisible: !s.isVisible }));
}

async function handleUploadFolderClick(): Promise<void> {
  uploadState.update((s) => ({ ...s, isVisible: true }));
  await tick();
  folderInput?.click();
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault();
}

async function handleDrop(e: DragEvent): Promise<void> {
  e.preventDefault();
  if (!e.dataTransfer) return;

  const uploadItems = await collectDroppedItems(e.dataTransfer);
  if (uploadItems.length > 0) {
    await handleUploadItems(uploadItems);
  }
}

function handleFileSelect(e: Event): void {
  const target = e.target as HTMLInputElement;
  if (target.files) {
    handleUploadItems(toUploadItems(target.files));
    target.value = '';
  }
}

function handleFolderSelect(e: Event): void {
  const target = e.target as HTMLInputElement;
  if (target.files) {
    handleUploadItems(toUploadItems(target.files));
    target.value = '';
  }
}

function toUploadItems(files: Iterable<File>): UploadFileItem[] {
  return Array.from(files).map((file) => ({
    file,
    relativePath: file.webkitRelativePath || file.name
  }));
}

interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

interface FileSystemFileEntryLike extends FileSystemEntryLike {
  file: (success: (file: File) => void, error?: (err: DOMException) => void) => void;
}

interface FileSystemDirectoryReaderLike {
  readEntries: (success: (entries: FileSystemEntryLike[]) => void, error?: (err: DOMException) => void) => void;
}

interface FileSystemDirectoryEntryLike extends FileSystemEntryLike {
  createReader: () => FileSystemDirectoryReaderLike;
}

interface DataTransferItemWithEntry {
  webkitGetAsEntry?: () => FileSystemEntryLike | null;
}

async function entryToUploadItems(entry: FileSystemEntryLike, parentPath = ''): Promise<UploadFileItem[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntryLike;
    const file = await new Promise<File>((resolve, reject) => {
      fileEntry.file(resolve, reject);
    });
    return [{ file, relativePath: parentPath ? `${parentPath}/${file.name}` : file.name }];
  }

  if (!entry.isDirectory) return [];

  const dirEntry = entry as FileSystemDirectoryEntryLike;
  const reader = dirEntry.createReader();
  const entries = await new Promise<FileSystemEntryLike[]>((resolve, reject) => {
    const collected: FileSystemEntryLike[] = [];
    const readAll = (): void => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(collected);
          return;
        }
        collected.push(...batch);
        readAll();
      }, reject);
    };
    readAll();
  });

  const nextPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
  const nested = await Promise.all(entries.map((child) => entryToUploadItems(child, nextPath)));
  return nested.flat();
}

async function collectDroppedItems(dataTransfer: DataTransfer): Promise<UploadFileItem[]> {
  const itemEntries = Array.from(dataTransfer.items || []);
  const hasEntryApi = itemEntries.some((item) => {
    const withEntry = item as unknown as DataTransferItemWithEntry;
    return typeof withEntry.webkitGetAsEntry === 'function';
  });

  if (!hasEntryApi) {
    return toUploadItems(dataTransfer.files);
  }

  const all: UploadFileItem[] = [];
  for (const item of itemEntries) {
    const withEntry = item as unknown as DataTransferItemWithEntry;
    const entry = withEntry.webkitGetAsEntry?.();
    if (!entry) continue;

    try {
      const items = await entryToUploadItems(entry);
      all.push(...items);
    } catch {
      // Some OS-protected files may throw AccessDenied; skip and continue.
    }
  }

  return all;
}

async function handleUploadItems(uploadItems: UploadFileItem[]): Promise<void> {
  if (uploadItems.length === 0) {
    showToast($_('uploadError'), 'error');
    return;
  }

  uploadState.set({
    isVisible: true,
    isUploading: true,
    progress: 15,
    text: $_('uploadBatchProgress', { values: { current: 0, total: uploadItems.length } })
  });

  try {
    const result = await uploadFiles(uploadItems, $currentPath, $activeServer!.id);
    const total = uploadItems.length;
    const uploadedCount = result.uploadedCount ?? (result.success ? total : 0);
    const failedCount = result.failedCount ?? (result.success ? 0 : total);

    uploadState.set({
      isVisible: true,
      isUploading: true,
      progress: 100,
      text: $_('uploadBatchProgress', { values: { current: uploadedCount, total } })
    });

    if (result.success) {
      showToast($_('uploadBatchDone', { values: { uploaded: uploadedCount, total } }));
    } else {
      showToast($_('uploadBatchPartial', { values: { uploaded: uploadedCount, failed: failedCount } }), 'warning');
      if (result.errors?.length) {
        for (const error of result.errors.slice(0, 3)) {
          showToast(`${$_('uploadError')}: ${error}`, 'error');
        }
      }
    }
  } catch (e) {
    const error = e as Error;
    showToast(`${$_('uploadError')}: ${error.message}`, 'error');
  }

  setTimeout(() => {
    uploadState.set({
      isVisible: false,
      isUploading: false,
      progress: 0,
      text: ''
    });
    navigateTo($currentPath);
  }, 500);
}

function handleSaveFile(): void {
  if (!$editorState.filePath) return;
  setEditorStatus($_('saving'), 'saving');
  emit('files:save', {
    path: $editorState.filePath,
    content: editorContent,
    createBackup
  });
}

function handleCloseEditor(): void {
  closeEditor();
}

function handleEditorKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    handleSaveFile();
  }
  if (e.key === 'Escape') {
    handleCloseEditor();
  }
}

function isEditable(file: FileEntry): boolean {
  return file.editable;
}

async function handleDownload(file: FileEntry): Promise<void> {
  const filePath = $currentPath === '/' ? `/${file.name}` : `${$currentPath}/${file.name}`;
  const result = await downloadFile(filePath, $activeServer!.id);
  if (!result.success) {
    showToast(`${$_('downloadFailed')}: ${result.error}`, 'error');
  }
}
</script>

<div class="space-y-3">
  <!-- Breadcrumb -->
  <div class="flex items-center gap-1 px-3 py-2 bg-panel-light border-4 border-panel-border overflow-x-auto">
    {#each breadcrumbParts as part, i}
      {#if i > 0}
        <span class="text-text-dim font-mono">/</span>
      {/if}
      <button 
        type="button" 
        class="px-2 py-1 font-mono text-sm transition-colors
               {i === breadcrumbParts.length - 1 
                 ? 'text-hytale-gold bg-panel-bg/50 border border-hytale-gold/30' 
                 : 'text-text-muted hover:text-grass-light hover:underline'}"
        onclick={() => navigateTo(part.path)}
      >
        {part.label}
      </button>
    {/each}
  </div>

  <!-- Toolbar -->
  <div class="flex flex-wrap items-center gap-2 px-3 py-2 bg-panel-light border-4 border-panel-border">
    <button 
      class="px-3 py-2 font-mono text-sm border-3 transition-all
             bg-panel-bg border-panel-border text-text-muted
             hover:bg-panel-lighter hover:text-text hover:border-grass/50
             shadow-mc-btn active:shadow-mc-btn-pressed"
      title={$_('refresh')} 
      onclick={() => navigateTo($currentPath)}
    >
      ↻
    </button>
    
    <button 
      class="px-3 py-2 font-mono text-sm border-3 transition-all
             bg-wood/30 border-wood-dark text-wood-light
             hover:bg-wood hover:text-panel-bg
             shadow-mc-btn active:shadow-mc-btn-pressed"
      onclick={handleNewFolder}
    >
      📁 {$_('newFolder')}
    </button>
    
    <button 
      class="px-3 py-2 font-mono text-sm border-3 transition-all
             bg-grass/30 border-grass-dark text-grass-light
             hover:bg-grass hover:text-panel-bg
             shadow-mc-btn active:shadow-mc-btn-pressed"
      onclick={toggleUploadZone}
    >
      ⬆ {$_('upload')}
    </button>

    {#if supportsDirectoryUpload}
      <button 
        class="px-3 py-2 font-mono text-sm border-3 transition-all
               bg-info/30 border-info text-info
               hover:bg-info hover:text-white
               shadow-mc-btn active:shadow-mc-btn-pressed"
        onclick={handleUploadFolderClick}
      >
        🗂 {$_('uploadFolder')}
      </button>
    {/if}

    <input type="file" bind:this={fileInput} class="hidden" multiple onchange={handleFileSelect} />
    <input type="file" bind:this={folderInput} class="hidden" webkitdirectory multiple onchange={handleFolderSelect} />
    
    <div class="flex-1 min-w-[150px]">
      <input
        type="text"
        class="w-full px-3 py-2 font-mono text-sm
               bg-panel-bg border-3 border-panel-border text-text
               placeholder:text-text-dim
               focus:outline-none focus:border-grass/50"
        placeholder="Search files..."
        bind:value={searchQuery}
      />
    </div>
  </div>

  <!-- Upload Zone -->
  {#if $uploadState.isVisible}
    <div 
      class="p-6 bg-panel-light border-4 border-dashed border-grass/50 text-center cursor-pointer
             hover:bg-panel-lighter hover:border-grass transition-colors"
      role="button" 
      tabindex="0" 
      ondragover={handleDragOver} 
      ondrop={handleDrop} 
      onclick={() => fileInput?.click()} 
      onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && fileInput?.click()}
    >
      <div class="text-4xl mb-2">📤</div>
      <div class="font-mono text-grass-light text-lg mb-1">{$_('dropFilesFoldersHere')}</div>
      <div class="font-mono text-text-dim text-sm">{$_('uploadHintExtended')}</div>
      {#if !supportsDirectoryUpload}
        <div class="mt-2 font-mono text-warning text-xs">{$_('folderUploadBrowserLimited')}</div>
      {/if}
      
      {#if $uploadState.isUploading}
        <div class="mt-4 space-y-2">
          <div class="h-4 bg-panel-bg border-2 border-panel-border overflow-hidden">
            <div 
              class="h-full bg-grass transition-all duration-300" 
              style="width: {$uploadState.progress}%"
            ></div>
          </div>
          <div class="font-mono text-text-muted text-sm">{$uploadState.text}</div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- File List -->
  <div class="bg-panel-light border-4 border-panel-border overflow-hidden">
    <!-- Header -->
    <div class="flex items-center px-4 py-3 bg-panel-bg/50 border-b-2 border-panel-border font-mono text-sm text-text-dim">
      <span class="flex-1">{$_('name')}</span>
      <span class="w-24 text-right">{$_('size')}</span>
      <span class="w-44 text-right">{$_('actions')}</span>
    </div>
    
    <!-- Body -->
    <div class="max-h-[400px] overflow-y-auto">
      {#if $currentPath !== '/'}
        <div 
          class="flex items-center px-4 py-3 border-b border-panel-border/50 cursor-pointer
                 hover:bg-panel-lighter transition-colors group"
          role="button" 
          tabindex="0" 
          onclick={goBack} 
          onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && goBack()}
        >
          <div class="flex-1 flex items-center gap-3">
            <span class="text-lg">📂</span>
            <span class="font-mono text-wood-light group-hover:text-grass-light">..</span>
          </div>
          <span class="w-24 text-right font-mono text-text-dim">-</span>
          <div class="w-44"></div>
        </div>
      {/if}

      {#if $isFilesLoading}
        {#each Array(5) as _}
          <div class="px-4 py-3 border-b border-panel-border/50">
            <Skeleton type="text" />
          </div>
        {/each}
      {:else if filteredFiles().length === 0 && $currentPath === '/' && !searchQuery}
        <div class="px-4 py-8 text-center">
          <div class="text-3xl mb-2">📭</div>
          <div class="font-mono text-text-dim">{$_('emptyDir')}</div>
        </div>
      {:else if filteredFiles().length === 0 && searchQuery}
        <div class="px-4 py-8 text-center">
          <div class="text-3xl mb-2">🔍</div>
          <div class="font-mono text-text-dim">No files match "{searchQuery}"</div>
        </div>
      {:else}
        {#each filteredFiles() as file}
          <div
            class="flex items-center px-4 py-3 border-b border-panel-border/50 cursor-pointer
                   hover:bg-panel-lighter transition-colors group"
            role="button"
            tabindex="0"
            onclick={() => handleFileClick(file)}
            ondblclick={() => handleFileDoubleClick(file)}
            onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleFileDoubleClick(file)}
          >
            <div class="flex-1 flex items-center gap-3 overflow-hidden">
              <span class="text-lg shrink-0">
                {#if file.isDirectory}
                  📁
                {:else if file.icon === 'config' || file.icon === 'yaml'}
                  📋
                {:else if file.icon === 'text'}
                  📜
                {:else if file.icon === 'java'}
                  ☕
                {:else if file.icon === 'archive'}
                  📦
                {:else if file.icon === 'image'}
                  🖼️
                {:else}
                  📄
                {/if}
              </span>
              <span class="font-mono truncate {file.isDirectory ? 'text-wood-light' : 'text-text'} group-hover:text-grass-light">
                {file.name}
              </span>
            </div>
            <span class="w-24 text-right font-mono text-text-dim text-sm">
              {file.isDirectory ? '-' : formatSize(file.size)}
            </span>
            <div class="w-44 flex justify-end gap-2">
              <button 
                class="px-2 py-1 font-mono text-xs border-2 transition-all
                       bg-panel-bg border-panel-border text-text-muted
                       hover:bg-info hover:border-info hover:text-white"
                onclick={(e: MouseEvent) => { e.stopPropagation(); handleDownload(file); }}
              >
                ⬇ {$_('downloadItem')}
              </button>
              {#if isEditable(file)}
                <button 
                  class="px-2 py-1 font-mono text-xs border-2 transition-all
                         bg-panel-bg border-panel-border text-text-muted
                         hover:bg-info hover:border-info hover:text-white"
                  onclick={(e: MouseEvent) => { e.stopPropagation(); handleEdit(file); }}
                >
                  {$_('edit')}
                </button>
              {/if}
              <button 
                class="px-2 py-1 font-mono text-xs border-2 transition-all
                       bg-panel-bg border-panel-border text-text-muted
                       hover:bg-error hover:border-error hover:text-white"
                onclick={(e: MouseEvent) => { e.stopPropagation(); handleDelete(file); }}
              >
                ✕
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<!-- Editor Modal -->
{#if $editorState.isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
    <div class="w-full max-w-4xl max-h-[90vh] flex flex-col bg-panel-bg border-4 border-panel-border shadow-pixel animate-bounce-in">
      <!-- Editor Header -->
      <div class="flex items-center justify-between px-4 py-3 bg-panel-light border-b-4 border-panel-border">
        <span class="font-mono text-hytale-gold truncate">{$editorState.filePath}</span>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              bind:checked={createBackup}
              class="w-4 h-4 accent-grass" 
            /> 
            <span class="font-mono text-sm text-text-muted">{$_('backup')}</span>
          </label>
          <button 
            class="px-3 py-1.5 font-mono text-sm border-3 transition-all
                   bg-grass border-grass-dark text-panel-bg
                   hover:bg-grass-light
                   shadow-mc-btn active:shadow-mc-btn-pressed"
            onclick={handleSaveFile}
          >
            💾 {$_('save')}
          </button>
          <button 
            class="px-3 py-1.5 font-mono text-sm border-3 transition-all
                   bg-stone border-stone-dark text-text
                   hover:bg-stone-light
                   shadow-mc-btn active:shadow-mc-btn-pressed"
            onclick={handleCloseEditor}
          >
            ✕ {$_('close')}
          </button>
        </div>
      </div>
      
      <!-- Editor Body -->
      <div class="flex-1 min-h-0 p-2 bg-[#0a0805]">
        <textarea 
          bind:value={editorContent} 
          spellcheck="false" 
          onkeydown={handleEditorKeydown}
          class="w-full h-full min-h-[400px] p-4 font-code text-sm leading-relaxed resize-none
                 bg-transparent text-text border-none outline-none"
        ></textarea>
      </div>
      
      <!-- Editor Status -->
      <div class="px-4 py-2 bg-panel-light border-t-2 border-panel-border font-mono text-sm"
           class:text-text-muted={$editorState.statusClass === 'ready'}
           class:text-warning={$editorState.statusClass === 'saving'}
           class:text-grass-light={$editorState.statusClass === 'saved'}
           class:text-error={$editorState.statusClass === 'error'}>
        {$editorState.status}
      </div>
    </div>
  </div>
{/if}
