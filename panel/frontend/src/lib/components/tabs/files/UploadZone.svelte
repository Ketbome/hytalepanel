<script lang="ts">
import { _ } from 'svelte-i18n';
import SegmentedProgress from '$lib/components/ui/SegmentedProgress.svelte';
import { type UploadFileItem, uploadFiles } from '$lib/services/api';
import { emit } from '$lib/services/socketClient';
import { currentPath, isFilesLoading, uploadState } from '$lib/stores/files';
import { activeServer } from '$lib/stores/servers';
import { showToast } from '$lib/stores/ui';
import { toUploadItems } from '$lib/utils/uploads';

export const supportsDirectoryUpload = typeof window !== 'undefined' && 'webkitdirectory' in HTMLInputElement.prototype;

let fileInput: HTMLInputElement | undefined = $state();
let folderInput: HTMLInputElement | undefined = $state();

export function openFilePicker(): void {
  fileInput?.click();
}

export function openFolderPicker(): void {
  folderInput?.click();
}

function handleSelect(e: Event): void {
  const target = e.target as HTMLInputElement;
  if (target.files) {
    upload(toUploadItems(target.files));
    target.value = '';
  }
}

export async function upload(uploadItems: UploadFileItem[]): Promise<void> {
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

{#if $uploadState.isUploading}
  <div class="flex h-10 items-center gap-4" aria-live="polite">
    <span class="shrink-0 text-[13px] text-fg-1">{$uploadState.text}</span>
    <SegmentedProgress class="min-w-0 flex-1" value={$uploadState.progress} label={$_('uploading')} />
  </div>
{/if}
