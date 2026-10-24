<script lang="ts">
import { _ } from 'svelte-i18n';
import BlockLoader from '$lib/components/ui/BlockLoader.svelte';
import Button from '$lib/components/ui/Button.svelte';
import Checkbox from '$lib/components/ui/Checkbox.svelte';
import Modal from '$lib/components/ui/Modal.svelte';
import { emit } from '$lib/services/socketClient';
import { closeEditor, editorState, setEditorStatus } from '$lib/stores/files';

let editorContent = $state('');
let createBackup = $state(true);

const loaded = $derived($editorState.content);
$effect(() => {
  editorContent = loaded;
});

const loading = $derived($editorState.status === 'loading');
const saving = $derived($editorState.statusClass === 'saving');

function handleSaveFile(): void {
  if (!$editorState.filePath || loading) return;
  setEditorStatus($_('saving'), 'saving');
  emit('files:save', {
    path: $editorState.filePath,
    content: editorContent,
    createBackup
  });
}

function handleEditorKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    handleSaveFile();
  }
}
</script>

<Modal
  open={$editorState.isOpen}
  title={$editorState.filePath ?? ''}
  monoTitle
  size="lg"
  initialFocus="textarea"
  onclose={closeEditor}
>
  <div class="relative">
    <textarea
      bind:value={editorContent}
      spellcheck="false"
      onkeydown={handleEditorKeydown}
      aria-label={$editorState.filePath ?? $_('edit')}
      readonly={loading}
      class="hp-editor block h-[min(60dvh,560px)] w-full resize-none rounded-md bg-sunken p-4 font-mono text-[13px] leading-5 text-fg-1"
    ></textarea>
    {#if loading}
      <div class="absolute inset-0 flex items-center justify-center gap-2 text-[13px] text-fg-3">
        <BlockLoader />{$_('loading')}
      </div>
    {/if}
  </div>

  {#snippet footerStart()}
    <span
      class="text-[13px]"
      class:text-fg-3={$editorState.statusClass === '' || $editorState.statusClass === 'ready'}
      class:text-fg-2={saving}
      class:text-positive={$editorState.statusClass === 'saved'}
      class:text-negative={$editorState.statusClass === 'error'}
      aria-live="polite"
    >
      {loading ? '' : $editorState.status === 'ready' ? $_('saveShortcut') : $editorState.status}
    </span>
  {/snippet}
  {#snippet footer()}
    <Checkbox bind:checked={createBackup}>{$_('backupBeforeSave')}</Checkbox>
    <Button variant="primary" loading={saving} disabled={loading} onclick={handleSaveFile}>{$_('save')}</Button>
  {/snippet}
</Modal>

<style>
  .hp-editor {
    border: 1px solid var(--hp-line-1);
  }

  .hp-editor:focus-visible {
    outline: none;
    border-color: var(--hp-accent);
    box-shadow: 0 0 0 1px var(--hp-accent);
  }
</style>
