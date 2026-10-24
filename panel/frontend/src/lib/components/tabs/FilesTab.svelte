<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Icon from '$lib/components/ui/Icon.svelte';
import Input from '$lib/components/ui/Input.svelte';
import Menu, { type MenuEntry } from '$lib/components/ui/Menu.svelte';
import Modal from '$lib/components/ui/Modal.svelte';
import { emit } from '$lib/services/socketClient';
import { currentPath, fileList, isFilesLoading } from '$lib/stores/files';
import Breadcrumbs from './files/Breadcrumbs.svelte';
import FileEditor from './files/FileEditor.svelte';
import FileList from './files/FileList.svelte';
import UploadZone from './files/UploadZone.svelte';

let searchQuery = $state('');
let uploadZone: UploadZone | undefined = $state();
let newFolderOpen = $state(false);
let folderName = $state('');
let folderInvalid = $state(false);

const filteredFiles = $derived.by(() => {
  if (!searchQuery.trim()) return $fileList;
  const lower = searchQuery.toLowerCase();
  return $fileList.filter((file) => file.name.toLowerCase().includes(lower));
});

const uploadItems = $derived<MenuEntry[]>([
  { label: $_('uploadFiles'), icon: 'file', onselect: () => uploadZone?.openFilePicker() },
  { label: $_('uploadFolder'), icon: 'folder', onselect: () => uploadZone?.openFolderPicker() }
]);

function refresh(): void {
  isFilesLoading.set(true);
  emit('files:list', $currentPath);
}

function openNewFolder(): void {
  folderName = '';
  folderInvalid = false;
  newFolderOpen = true;
}

function createFolder(e: SubmitEvent): void {
  e.preventDefault();
  const name = folderName.trim();
  if (!name || name.includes('/')) {
    folderInvalid = true;
    return;
  }
  const folderPath = $currentPath === '/' ? `/${name}` : `${$currentPath}/${name}`;
  emit('files:mkdir', folderPath);
  newFolderOpen = false;
}
</script>

<div class="flex flex-col gap-3">
  <Breadcrumbs />

  <div class="flex items-center gap-2">
    <Input
      type="search"
      class="min-w-0 flex-1"
      placeholder={$_('searchFiles')}
      aria-label={$_('searchFiles')}
      bind:value={searchQuery}
    >
      {#snippet leading()}<Icon name="search" />{/snippet}
    </Input>
    <Button
      variant="ghost"
      iconOnly
      icon="refresh-cw"
      playIcon={$isFilesLoading}
      aria-label={$_('refresh')}
      title={$_('refresh')}
      onclick={refresh}
    />
    <Button variant="ghost" iconOnly icon="folder-plus" aria-label={$_('newFolder')} title={$_('newFolder')} onclick={openNewFolder} />
    {#if uploadZone?.supportsDirectoryUpload}
      <Menu items={uploadItems} label={$_('upload')} align="end">
        {#snippet trigger(props)}
          <Button variant="secondary" icon="upload" trailingIcon="chevron-down" {...props}>{$_('upload')}</Button>
        {/snippet}
      </Menu>
    {:else}
      <Button variant="secondary" icon="upload" onclick={() => uploadZone?.openFilePicker()}>{$_('upload')}</Button>
    {/if}
  </div>

  <UploadZone bind:this={uploadZone} />

  <FileList
    files={filteredFiles}
    {searchQuery}
    onClearSearch={() => (searchQuery = '')}
    onUpload={() => uploadZone?.openFilePicker()}
    onDropItems={(items) => uploadZone?.upload(items)}
  />
</div>

<FileEditor />

<Modal open={newFolderOpen} title={$_('newFolder')} size="sm" onclose={() => (newFolderOpen = false)}>
  <form id="new-folder-form" class="hp-field-group" onsubmit={createFolder}>
    <label for="new-folder-name">{$_('folderName')}</label>
    <Input
      id="new-folder-name"
      mono
      bind:value={folderName}
      invalid={folderInvalid}
      aria-describedby={folderInvalid ? 'new-folder-error' : undefined}
      oninput={() => (folderInvalid = false)}
      autocomplete="off"
      data-autofocus
    />
    {#if folderInvalid}
      <p id="new-folder-error" class="flex items-center gap-1.5 text-xs text-negative">
        <Icon name="circle-alert" size={12} />{$_('folderNameInvalid')}
      </p>
    {/if}
    <p class="text-xs text-fg-3">{$_('folderCreatedIn', { values: { path: $currentPath } })}</p>
  </form>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (newFolderOpen = false)}>{$_('cancel')}</Button>
    <Button variant="primary" type="submit" form="new-folder-form">{$_('create')}</Button>
  {/snippet}
</Modal>
