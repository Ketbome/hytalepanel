<script lang="ts">
interface ModalProps {
  open?: boolean;
  title?: string;
  onclose?: () => void;
  children?: import('svelte').Snippet;
}

let { open = $bindable(false), title, onclose, children }: ModalProps = $props();

function handleBackdropClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) {
    close();
  }
}

function close(): void {
  open = false;
  onclose?.();
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && open) {
    close();
  }
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-[fade-in_0.2s_ease-out]"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === 'Enter' && handleBackdropClick(e as unknown as MouseEvent)}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
    tabindex="-1"
  >
    <div class="bg-gradient-to-b from-mc-panel-light to-mc-panel border-[4px] border-t-mc-border-light border-l-mc-border-light border-r-mc-dark border-b-mc-dark max-w-2xl w-full max-h-[90vh] overflow-auto animate-[slide-in_0.3s_cubic-bezier(0.16,1,0.3,1)]">
      {#if title}
        <div class="bg-mc-panel border-b-2 border-mc-border-light px-5 py-3 flex justify-between items-center">
          <h2 id="modal-title" class="font-[var(--font-mono)] text-lg text-hytale-yellow">{title}</h2>
          <button
            onclick={close}
            class="text-text-dim hover:text-white text-2xl leading-none transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
      {/if}
      <div class="p-5">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}
