<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Input from '$lib/components/ui/Input.svelte';
import { emit } from '$lib/services/socketClient';
import { currentPath, fileList, isFilesLoading, uploadState } from '$lib/stores/files';
import Breadcrumbs from './files/Breadcrumbs.svelte';
import FileEditor from './files/FileEditor.svelte';
import FileList from './files/FileList.svelte';
import UploadZone from './files/UploadZone.svelte';

let searchQuery = $state('');
let uploadZone: UploadZone | undefined = $state();

const filteredFiles = $derived.by(() => {
  if (!searchQuery.trim()) return $fileList;
  const lower = searchQuery.toLowerCase();
  return $fileList.filter((file) => file.name.toLowerCase().includes(lower));
});

function refresh(): void {
  isFilesLoading.set(true);
  emit('files:list', $currentPath);
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

function handleUploadFolderClick(): void {
  uploadState.update((s) => ({ ...s, isVisible: true }));
  uploadZone?.openFolderPicker();
}
</script>

<div class="space-y-3">
  <Breadcrumbs />

  <!-- Toolbar -->
  <div class="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-panel-light border border-panel-border">
    <Button size="small" title={$_('refresh')} aria-label={$_('refresh')} onclick={refresh}>↻</Button>
    <Button size="small" variant="wood" onclick={handleNewFolder}>📁 {$_('newFolder')}</Button>
    <Button size="small" variant="primary" onclick={toggleUploadZone}>⬆ {$_('upload')}</Button>
    {#if uploadZone?.supportsDirectoryUpload}
      <Button size="small" onclick={handleUploadFolderClick}>🗂 {$_('uploadFolder')}</Button>
    {/if}

    <div class="flex-1 min-w-[150px]">
      <Input type="text" class="!py-2 !text-sm" placeholder={$_('searchFiles')} aria-label={$_('searchFiles')} bind:value={searchQuery} />
    </div>
  </div>

  <UploadZone bind:this={uploadZone} />

  <FileList files={filteredFiles} {searchQuery} />
</div>

<FileEditor />
