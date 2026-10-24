<script lang="ts">
import type { Snippet } from 'svelte';
import type { HTMLSelectAttributes } from 'svelte/elements';
import Icon from './Icon.svelte';

interface SelectProps extends Omit<HTMLSelectAttributes, 'value' | 'class'> {
  value?: string;
  mono?: boolean;
  class?: string;
  children?: Snippet;
}

let { value = $bindable(''), mono = false, class: className = '', children, ...rest }: SelectProps = $props();
</script>

<div class="relative flex items-center {className}">
  <select bind:value class="hp-select w-full h-8 rounded-xs text-fg-1 {mono ? 'font-mono text-[13px]' : 'text-sm'}" {...rest}>
    {@render children?.()}
  </select>
  <span class="pointer-events-none absolute right-2 flex text-fg-3"><Icon name="chevron-down" /></span>
</div>

<style>
  .hp-select {
    appearance: none;
    background: var(--hp-bg-sunken);
    border: 1px solid var(--hp-line-control);
    padding: 0 32px 0 10px;
    cursor: pointer;
    transition: border-color var(--hp-dur-hover) ease;
  }

  .hp-select:hover:not(:disabled) {
    border-color: var(--hp-fg-3);
  }

  .hp-select:focus-visible {
    outline: none;
    border-color: var(--hp-accent);
    box-shadow: 0 0 0 1px var(--hp-accent);
  }

  .hp-select:disabled {
    background: var(--hp-bg-1);
    border-color: var(--hp-line-1);
    color: var(--hp-fg-2);
    cursor: not-allowed;
  }

  .hp-select :global(option) {
    background: var(--hp-bg-1);
    color: var(--hp-fg-1);
  }
</style>
