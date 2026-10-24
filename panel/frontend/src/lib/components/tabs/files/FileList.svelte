<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Icon, { type IconName } from '$lib/components/ui/Icon.svelte';
import InlineNotice from '$lib/components/ui/InlineNotice.svelte';
import Skeleton from '$lib/components/ui/Skeleton.svelte';
import { downloadFile, type UploadFileItem } from '$lib/services/api';
import { emit } from '$lib/services/socketClient';
import { confirmDialog } from '$lib/stores/confirm';
import { currentPath, filesError, isFilesLoading, openEditor } from '$lib/stores/files';
import { activeServer } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import type { FileEntry, FileType } from '$lib/types';
import { formatSize } from '$lib/utils/formatters';
import { collectDroppedItems } from '$lib/utils/uploads';

const {
  files,
  searchQuery,
  onClearSearch,
  onUpload,
  onDropItems
}: {
  files: FileEntry[];
  searchQuery: string;
  onClearSearch: () => void;
  onUpload: () => void;
  onDropItems: (items: UploadFileItem[]) => void;
} = $props();

let dragDepth = $state(0);
const dragging = $derived(dragDepth > 0);

const fileIcons: Partial<Record<FileType, IconName>> = {
  folder: 'folder',
  java: 'file-code',
  script: 'file-code',
  json: 'file-code',
  yaml: 'file-code',
  config: 'file-code',
  archive: 'file-archive',
  image: 'file-image',
  text: 'file-text',
  log: 'file-text'
};

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

function openFile(file: FileEntry): void {
  if (!file.isDirectory) {
    openEditor(fullPath(file));
    emit('files:read', fullPath(file));
  }
}

async function handleDelete(file: FileEntry): Promise<void> {
  if (
    await confirmDialog($_('confirmDeleteMsg'), {
      title: $_('confirmDelete', { values: { name: file.name } }),
      confirmLabel: $_('delete'),
      danger: true
    })
  ) {
    emit('files:delete', fullPath(file));
  }
}

async function handleDownload(file: FileEntry): Promise<void> {
  const result = await downloadFile(fullPath(file), $activeServer!.id);
  if (!result.success) {
    showToast(`${$_('downloadFailed')}: ${result.error}`, 'error');
  }
}

function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files');
}

async function handleDrop(e: DragEvent): Promise<void> {
  e.preventDefault();
  dragDepth = 0;
  if (!e.dataTransfer) return;
  const items = await collectDroppedItems(e.dataTransfer);
  if (items.length > 0) onDropItems(items);
}
</script>

<div
  class="relative"
  role="region"
  aria-label={$_('files')}
  ondragenter={(e) => {
    if (hasFiles(e)) dragDepth++;
  }}
  ondragleave={() => (dragDepth = Math.max(0, dragDepth - 1))}
  ondragover={(e) => {
    if (hasFiles(e)) e.preventDefault();
  }}
  ondrop={handleDrop}
>
  <div class="-mx-2 grid h-8 grid-cols-[minmax(0,1fr)_80px_88px] items-center border-b border-line px-2 text-xs text-fg-3" aria-hidden="true">
    <span>{$_('name')}</span>
    <span class="text-right">{$_('size')}</span>
    <span></span>
  </div>

  {#if $filesError}
    <InlineNotice kind="negative" title={$_('filesLoadError')} class="mt-3">
      <span class="text-fg-3">{$filesError}</span>
      {#snippet action()}
        <Button variant="ghost" size="sm" onclick={() => navigateTo($currentPath)}>{$_('retry')}</Button>
      {/snippet}
    </InlineNotice>
  {/if}

  <ul class="hp-list -mx-2">
    {#if $currentPath !== '/'}
      <li class="grid h-9 grid-cols-[minmax(0,1fr)_80px_88px] items-center px-2">
        <button type="button" class="flex min-w-0 items-center gap-2 text-left text-sm text-fg-1 hover:underline" onclick={goBack}>
          <span class="text-fg-2"><Icon name="folder" /></span>
          <span class="font-mono">..</span>
        </button>
        <span class="text-right font-mono text-xs text-fg-3">—</span>
        <span></span>
      </li>
    {/if}

    {#if $isFilesLoading}
      {#each Array(6) as _item}
        <li class="flex h-9 items-center gap-2 px-2" aria-hidden="true">
          <Skeleton width="16px" height="16px" />
          <Skeleton width="40%" />
        </li>
      {/each}
    {:else if files.length === 0 && searchQuery}
      <li class="flex flex-col items-start gap-2 px-2 py-6 text-sm text-fg-2">
        {$_('noFilesMatch', { values: { query: searchQuery } })}
        <Button variant="ghost" size="sm" class="-ml-2.5" onclick={onClearSearch}>{$_('clearSearch')}</Button>
      </li>
    {:else if files.length === 0 && !$filesError}
      <li class="flex flex-col items-start gap-2 px-2 py-6 text-sm text-fg-2">
        {$_('emptyDir')}
        <Button variant="ghost" size="sm" icon="upload" class="-ml-2.5" onclick={onUpload}>{$_('upload')}</Button>
      </li>
    {:else}
      {#each files as file (file.name)}
        <li class="hp-file grid h-9 grid-cols-[minmax(0,1fr)_80px_88px] items-center px-2">
          <div class="flex min-w-0 items-center gap-2">
            <span class={file.isDirectory ? 'text-fg-2' : 'text-fg-3'}>
              <Icon name={file.isDirectory ? 'folder' : (fileIcons[file.icon] ?? 'file')} />
            </span>
            {#if file.isDirectory}
              <button
                type="button"
                class="min-w-0 truncate text-left text-sm font-medium text-fg-1 hover:underline"
                title={file.name}
                onclick={() => navigateTo(fullPath(file))}
              >
                {file.name}
              </button>
            {:else if file.editable}
              <button
                type="button"
                class="min-w-0 truncate text-left text-sm text-fg-1 hover:underline"
                title={file.name}
                onclick={() => openFile(file)}
              >
                {file.name}
              </button>
            {:else}
              <span class="min-w-0 truncate text-sm text-fg-1" title={file.name}>{file.name}</span>
            {/if}
          </div>
          <span class="text-right font-mono text-xs tabular-nums text-fg-2">
            {file.isDirectory ? '—' : formatSize(file.size)}
          </span>
          <div class="hp-row-actions flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon="download"
              aria-label={$_('downloadNamed', { values: { name: file.name } })}
              title={$_('downloadItem')}
              onclick={() => handleDownload(file)}
            />
            {#if file.editable}
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon="pencil"
                aria-label={$_('editNamed', { values: { name: file.name } })}
                title={$_('edit')}
                onclick={() => openFile(file)}
              />
            {/if}
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon="trash-2"
              class="hp-delete"
              aria-label={$_('deleteNamed', { values: { name: file.name } })}
              title={$_('delete')}
              onclick={() => handleDelete(file)}
            />
          </div>
        </li>
      {/each}
    {/if}
  </ul>

  {#if dragging}
    <div class="hp-drop pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md bg-sunken/90">
      <p class="font-mono text-[13px] text-fg-1">{$_('dropToUpload', { values: { path: $currentPath } })}</p>
    </div>
  {/if}
</div>

<style>
  .hp-file {
    transition: background-color var(--hp-dur-hover) ease;
  }

  .hp-file:hover {
    background: var(--hp-bg-2);
  }

  @media (hover: hover) and (pointer: fine) {
    .hp-row-actions :global(.hp-btn) {
      color: var(--hp-fg-3);
    }
    .hp-file:hover .hp-row-actions :global(.hp-btn),
    .hp-file:focus-within .hp-row-actions :global(.hp-btn) {
      color: var(--hp-fg-1);
    }
  }

  .hp-file:hover .hp-row-actions :global(.hp-delete:hover),
  .hp-row-actions :global(.hp-delete:hover) {
    color: var(--hp-negative);
  }

  .hp-drop {
    outline: 1px dashed var(--hp-accent);
    outline-offset: -1px;
  }
</style>
