<script lang="ts">
import { _ } from 'svelte-i18n';
import Skeleton from '$lib/components/ui/Skeleton.svelte';
import { downloadFile } from '$lib/services/api';
import { emit } from '$lib/services/socketClient';
import { confirmDialog } from '$lib/stores/confirm';
import { currentPath, isFilesLoading, openEditor } from '$lib/stores/files';
import { activeServer } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import type { FileEntry } from '$lib/types';
import { formatSize } from '$lib/utils/formatters';

const { files, searchQuery }: { files: FileEntry[]; searchQuery: string } = $props();

function fullPath(file: FileEntry): string {
  return $currentPath === '/' ? `/${file.name}` : `${$currentPath}/${file.name}`;
}

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
    navigateTo(fullPath(file));
  }
}

function openFile(file: FileEntry): void {
  if (!file.isDirectory) {
    openEditor(fullPath(file));
    emit('files:read', fullPath(file));
  }
}

async function handleDelete(file: FileEntry): Promise<void> {
  if (await confirmDialog(`${$_('confirmDelete')} "${file.name}"?`, { danger: true })) {
    emit('files:delete', fullPath(file));
  }
}

async function handleDownload(file: FileEntry): Promise<void> {
  const result = await downloadFile(fullPath(file), $activeServer!.id);
  if (!result.success) {
    showToast(`${$_('downloadFailed')}: ${result.error}`, 'error');
  }
}

const rowAction =
  'px-2 py-1 text-xs rounded-md border border-panel-border bg-panel-bg text-text-muted transition-colors';
</script>

<div class="rounded-xl bg-panel-light border border-panel-border overflow-hidden">
  <!-- Header -->
  <div class="flex items-center px-4 py-3 bg-panel-bg border-b border-panel-border text-sm text-text-dim">
    <span class="flex-1">{$_('name')}</span>
    <span class="w-24 text-right">{$_('size')}</span>
    <span class="w-44 text-right">{$_('actions')}</span>
  </div>

  <!-- Body -->
  <div class="max-h-[400px] overflow-y-auto">
    {#if $currentPath !== '/'}
      <button
        type="button"
        class="w-full flex items-center px-4 py-3 border-b border-panel-border/50 cursor-pointer
               hover:bg-panel-lighter transition-colors group text-left"
        onclick={goBack}
      >
        <div class="flex-1 flex items-center gap-3">
          <span class="text-lg">📂</span>
          <span class="text-text-muted group-hover:text-hytale-gold">..</span>
        </div>
        <span class="w-24 text-right text-text-dim">-</span>
        <div class="w-44"></div>
      </button>
    {/if}

    {#if $isFilesLoading}
      {#each Array(5) as _item}
        <div class="px-4 py-3 border-b border-panel-border/50">
          <Skeleton type="text" />
        </div>
      {/each}
    {:else if files.length === 0 && $currentPath === '/' && !searchQuery}
      <div class="px-4 py-8 text-center">
        <div class="text-3xl mb-2">📭</div>
        <div class="text-text-dim">{$_('emptyDir')}</div>
      </div>
    {:else if files.length === 0 && searchQuery}
      <div class="px-4 py-8 text-center">
        <div class="text-3xl mb-2">🔍</div>
        <div class="text-text-dim">{$_('noFilesMatch', { values: { query: searchQuery } })}</div>
      </div>
    {:else}
      {#each files as file}
        <div
          class="flex items-center px-4 py-3 border-b border-panel-border/50 cursor-pointer
                 hover:bg-panel-lighter transition-colors group"
          role="button"
          tabindex="0"
          onclick={() => handleFileClick(file)}
          ondblclick={() => openFile(file)}
          onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && (file.isDirectory ? handleFileClick(file) : openFile(file))}
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
            <span class="truncate {file.isDirectory ? 'text-hytale-cream' : 'text-text'} group-hover:text-hytale-gold">
              {file.name}
            </span>
          </div>
          <span class="w-24 text-right text-text-dim text-sm">
            {file.isDirectory ? '-' : formatSize(file.size)}
          </span>
          <div class="w-44 flex justify-end gap-2">
            <button
              type="button"
              class="{rowAction} hover:border-info hover:text-info"
              onclick={(e: MouseEvent) => {
                e.stopPropagation();
                handleDownload(file);
              }}
            >
              ⬇ {$_('downloadItem')}
            </button>
            {#if file.editable}
              <button
                type="button"
                class="{rowAction} hover:border-info hover:text-info"
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  openFile(file);
                }}
              >
                {$_('edit')}
              </button>
            {/if}
            <button
              type="button"
              class="{rowAction} hover:border-error hover:text-error"
              aria-label="{$_('confirmDelete')} {file.name}"
              onclick={(e: MouseEvent) => {
                e.stopPropagation();
                handleDelete(file);
              }}
            >
              ✕
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
