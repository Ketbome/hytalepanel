<script lang="ts">
import { type Snippet, untrack } from 'svelte';
import { fade } from 'svelte/transition';
import { _ } from 'svelte-i18n';
import Button from './Button.svelte';

interface ModalProps {
  open: boolean;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  /** Title set in the code face (file paths) */
  monoTitle?: boolean;
  /** CSS selector for the element that gets focus on open; defaults to [data-autofocus], then the first field */
  initialFocus?: string;
  onclose?: () => void;
  children?: Snippet;
  footer?: Snippet;
  footerStart?: Snippet;
}

const {
  open,
  title,
  size = 'sm',
  monoTitle = false,
  initialFocus,
  onclose,
  children,
  footer,
  footerStart
}: ModalProps = $props();

const uid = $props.id();
const widths = { sm: 'max-w-[400px]', md: 'max-w-[560px]', lg: 'max-w-[960px]' };

let dialogEl = $state<HTMLElement | null>(null);
let bodyEl = $state<HTMLElement | null>(null);

function focusables(): HTMLElement[] {
  if (!dialogEl) return [];
  return Array.from(
    dialogEl.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter((el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0);
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

// Focus moves only when the dialog opens, not on every prop/store update while it is open
const isOpen = $derived(open);

$effect(() => {
  const dialog = dialogEl;
  if (!isOpen || !dialog) return;
  const previousFocus = document.activeElement as HTMLElement | null;
  untrack(() => {
    const target =
      (initialFocus && dialog.querySelector<HTMLElement>(initialFocus)) ||
      dialog.querySelector<HTMLElement>('[data-autofocus]') ||
      bodyEl?.querySelector<HTMLElement>('input, select, textarea, button') ||
      dialog;
    target.focus();
  });
  return () => {
    previousFocus?.focus();
  };
});
</script>

{#if open}
  <div
    class="hp-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
    role="presentation"
    out:fade={{ duration: 140 }}
    onclick={(e) => {
      if (e.target === e.currentTarget) onclose?.();
    }}
    onkeydown={handleKeydown}
  >
    <div
      bind:this={dialogEl}
      class="hp-dialog hp-motion-scale flex w-full flex-col bg-surface border border-line-2 rounded-lg shadow-overlay outline-none {widths[size]}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="{uid}-title"
      tabindex="-1"
    >
      <header class="flex items-center gap-3 p-5 pb-4">
        <h2
          id="{uid}-title"
          class="flex-1 min-w-0 truncate text-fg-1 {monoTitle ? 'font-mono text-[13px]' : 'text-base font-semibold'}"
          title={monoTitle ? title : undefined}
        >
          {title}
        </h2>
        <Button variant="ghost" size="sm" iconOnly icon="x" aria-label={$_('close')} class="-my-1 -mr-2" onclick={() => onclose?.()} />
      </header>
      <div bind:this={bodyEl} class="min-h-0 flex-1 overflow-y-auto px-5">
        {@render children?.()}
      </div>
      {#if footer}
        <footer class="flex flex-wrap items-center justify-end gap-2 p-5">
          {#if footerStart}
            <div class="mr-auto min-w-0">{@render footerStart()}</div>
          {/if}
          {@render footer()}
        </footer>
      {:else}
        <div class="h-5"></div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .hp-backdrop {
    background: rgb(8 7 6 / 0.72);
    transition: opacity var(--hp-dur-modal) var(--hp-ease-out);
  }

  .hp-dialog {
    max-height: calc(100dvh - 32px);
    transition:
      opacity var(--hp-dur-modal) var(--hp-ease-out),
      transform var(--hp-dur-modal) var(--hp-ease-out);
  }

  @starting-style {
    .hp-backdrop {
      opacity: 0;
    }
    .hp-dialog {
      opacity: 0;
      transform: scale(0.97);
    }
  }
</style>
