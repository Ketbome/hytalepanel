<script lang="ts">
import type { Snippet } from 'svelte';

interface ModalProps {
  open: boolean;
  title?: string;
  maxWidth?: string;
  onclose?: () => void;
  children?: Snippet;
  footer?: Snippet;
}

const { open, title, maxWidth = '28rem', onclose, children, footer }: ModalProps = $props();

let dialogEl = $state<HTMLElement | null>(null);
let previousFocus: HTMLElement | null = null;

function focusables(): HTMLElement[] {
  if (!dialogEl) return [];
  return Array.from(
    dialogEl.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter((el) => !el.hasAttribute('disabled'));
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.stopPropagation();
    onclose?.();
    return;
  }
  if (e.key === 'Tab') {
    const items = focusables();
    if (items.length === 0) {
      // Nothing focusable inside: keep focus trapped on the dialog itself
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

$effect(() => {
  if (open && dialogEl) {
    previousFocus = document.activeElement as HTMLElement | null;
    const items = focusables();
    (items[0] ?? dialogEl).focus();
    return () => {
      previousFocus?.focus();
      previousFocus = null;
    };
  }
});
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) onclose?.();
    }}
    onkeydown={handleKeydown}
  >
    <div
      bind:this={dialogEl}
      class="mc-panel w-full animate-bounce-in outline-none"
      style="max-width: {maxWidth}"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
    >
      {#if title}
        <div class="mc-panel-header">
          <span>{title}</span>
        </div>
      {/if}
      <div class="mc-panel-body">
        {@render children?.()}
      </div>
      {#if footer}
        <div class="px-5 pb-5 flex justify-end gap-3">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
