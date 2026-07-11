<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import { emit } from '$lib/services/socketClient';
import { closeEditor, editorState, setEditorStatus } from '$lib/stores/files';

let editorContent = $state('');
let createBackup = $state(true);

$effect(() => {
  editorContent = $editorState.content;
});

function handleSaveFile(): void {
  if (!$editorState.filePath) return;
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
  if (e.key === 'Escape') {
    closeEditor();
  }
}
</script>

{#if $editorState.isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div
      class="w-full max-w-4xl max-h-[90vh] flex flex-col mc-panel animate-bounce-in"
      role="dialog"
      aria-modal="true"
      aria-label={$editorState.filePath}
    >
      <!-- Editor Header -->
      <div class="flex items-center justify-between px-4 py-3 bg-panel-light border-b border-panel-border">
        <span class="font-code text-sm text-hytale-gold truncate">{$editorState.filePath}</span>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" bind:checked={createBackup} class="w-4 h-4 accent-hytale-orange" />
            <span class="text-sm text-text-muted">{$_('backup')}</span>
          </label>
          <Button size="small" variant="primary" onclick={handleSaveFile}>
            💾 {$_('save')}
          </Button>
          <Button size="small" onclick={() => closeEditor()}>
            ✕ {$_('close')}
          </Button>
        </div>
      </div>

      <!-- Editor Body -->
      <div class="flex-1 min-h-0 p-2 bg-[#100e0b]">
        <textarea
          bind:value={editorContent}
          spellcheck="false"
          onkeydown={handleEditorKeydown}
          class="w-full h-full min-h-[400px] p-4 font-code text-sm leading-relaxed resize-none
                 bg-transparent text-text border-none outline-none"
        ></textarea>
      </div>

      <!-- Editor Status -->
      <div
        class="px-4 py-2 bg-panel-light border-t border-panel-border text-sm"
        class:text-text-muted={$editorState.statusClass === 'ready'}
        class:text-warning={$editorState.statusClass === 'saving'}
        class:text-grass-light={$editorState.statusClass === 'saved'}
        class:text-error={$editorState.statusClass === 'error'}
        aria-live="polite"
      >
        {$editorState.status}
      </div>
    </div>
  </div>
{/if}
