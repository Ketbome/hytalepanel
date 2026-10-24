<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  checked?: boolean;
  disabled?: boolean;
  id?: string;
  hint?: string;
  title?: string;
  class?: string;
  onchange?: (e: Event) => void;
  children?: Snippet;
}

let {
  checked = $bindable(false),
  disabled = false,
  id,
  hint,
  title,
  class: className = '',
  onchange,
  children
}: Props = $props();

const uid = $props.id();
const hintId = $derived(hint ? `${id ?? uid}-hint` : undefined);
</script>

<label class="hp-check flex items-start gap-2 {disabled ? 'cursor-not-allowed' : 'cursor-pointer'} {className}" {title}>
  <input
    type="checkbox"
    id={id ?? uid}
    bind:checked
    {disabled}
    aria-describedby={hintId}
    {onchange}
    class="hp-box mt-0.5 h-4 w-4 shrink-0 rounded-xs"
  />
  <span class="flex flex-col gap-1 min-w-0">
    <span class="text-sm" class:text-fg-1={!disabled} class:text-fg-2={disabled}>{@render children?.()}</span>
    {#if hint}<span id={hintId} class="text-xs text-fg-3">{hint}</span>{/if}
  </span>
</label>

<style>
  .hp-box {
    appearance: none;
    display: grid;
    place-content: center;
    background: var(--hp-bg-sunken);
    border: 1px solid var(--hp-line-control);
    cursor: inherit;
    transition:
      background-color var(--hp-dur-hover) ease,
      border-color var(--hp-dur-hover) ease;
  }

  /* 2px check with square caps */
  .hp-box::after {
    content: "";
    width: 8px;
    height: 4px;
    margin-top: -2px;
    border-left: 2px solid var(--hp-accent-ink);
    border-bottom: 2px solid var(--hp-accent-ink);
    transform: rotate(-45deg);
    opacity: 0;
  }

  .hp-box:checked {
    background: var(--hp-accent);
    border-color: var(--hp-accent);
  }

  .hp-box:checked::after {
    opacity: 1;
  }

  .hp-check:hover .hp-box:not(:disabled):not(:checked) {
    border-color: var(--hp-fg-3);
  }

  .hp-box:disabled {
    background: var(--hp-bg-1);
    border-color: var(--hp-line-1);
  }

  .hp-box:disabled:checked {
    background: var(--hp-bg-3);
    border-color: var(--hp-line-2);
  }

  .hp-box:disabled:checked::after {
    border-color: var(--hp-fg-2);
  }
</style>
