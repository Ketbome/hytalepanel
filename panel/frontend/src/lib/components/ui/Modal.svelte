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
    class="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 animate-fade-in"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === 'Enter' && handleBackdropClick(e as unknown as MouseEvent)}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
    tabindex="-1"
  >
    <div class="mc-panel max-w-2xl w-full max-h-[90vh] overflow-auto animate-bounce-in">
      {#if title}
        <div class="mc-panel-header">
          <h2 id="modal-title" class="text-shadow-pixel">{title}</h2>
          <button
            onclick={close}
            class="mc-btn mc-btn-sm !px-3 !py-1"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
      {/if}
      <div class="mc-panel-body">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}
