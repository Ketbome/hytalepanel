<script lang="ts">
import { _ } from 'svelte-i18n';
import { type UploadFileItem, uploadFiles } from '$lib/services/api';
import { emit } from '$lib/services/socketClient';
import { currentPath, isFilesLoading, uploadState } from '$lib/stores/files';
import { activeServer } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import { collectDroppedItems, toUploadItems } from '$lib/utils/uploads';

export const supportsDirectoryUpload = typeof window !== 'undefined' && 'webkitdirectory' in HTMLInputElement.prototype;

let fileInput: HTMLInputElement | undefined = $state();
let folderInput: HTMLInputElement | undefined = $state();

export function openFilePicker(): void {
  fileInput?.click();
}

export function openFolderPicker(): void {
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

function handleSelect(e: Event): void {
  const target = e.target as HTMLInputElement;
  if (target.files) {
    handleUploadItems(toUploadItems(target.files));
    target.value = '';
  }
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
    isFilesLoading.set(true);
    emit('files:list', $currentPath);
  }, 500);
}
</script>

<input type="file" bind:this={fileInput} class="hidden" multiple onchange={handleSelect} />
<input type="file" bind:this={folderInput} class="hidden" webkitdirectory multiple onchange={handleSelect} />

{#if $uploadState.isVisible}
  <div
    class="p-6 rounded-xl bg-panel-light border-2 border-dashed border-hytale-orange/40 text-center cursor-pointer
           hover:bg-panel-lighter hover:border-hytale-orange transition-colors"
    role="button"
    tabindex="0"
    ondragover={handleDragOver}
    ondrop={handleDrop}
    onclick={() => fileInput?.click()}
    onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && fileInput?.click()}
  >
    <div class="text-4xl mb-2">📤</div>
    <div class="text-hytale-gold mb-1">{$_('dropFilesFoldersHere')}</div>
    <div class="text-text-dim text-sm">{$_('uploadHintExtended')}</div>
    {#if !supportsDirectoryUpload}
      <div class="mt-2 text-warning text-xs">{$_('folderUploadBrowserLimited')}</div>
    {/if}

    {#if $uploadState.isUploading}
      <div class="mt-4 space-y-2">
        <div class="mc-progress">
          <div class="mc-progress-bar" style="width: {$uploadState.progress}%"></div>
        </div>
        <div class="text-text-muted text-sm" aria-live="polite">{$uploadState.text}</div>
      </div>
    {/if}
  </div>
{/if}
