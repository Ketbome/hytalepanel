<script lang="ts">
import type { Snippet } from 'svelte';
import type { HTMLInputAttributes } from 'svelte/elements';

interface InputProps extends Omit<HTMLInputAttributes, 'size' | 'value' | 'class'> {
  value?: string | number;
  size?: 'md' | 'lg';
  mono?: boolean;
  invalid?: boolean;
  /** Unit shown inside the right padding, e.g. "min", "days" */
  suffix?: string;
  class?: string;
  inputClass?: string;
  leading?: Snippet;
  ref?: HTMLInputElement | null;
}

let {
  value = $bindable(''),
  size = 'md',
  mono = false,
  invalid = false,
  suffix,
  class: className = '',
  inputClass = '',
  leading,
  ref = $bindable(null),
  ...rest
}: InputProps = $props();
</script>

<div class="hp-field relative flex items-center {className}">
  {#if leading}
    <span class="pointer-events-none absolute left-2.5 flex items-center text-fg-3">{@render leading()}</span>
  {/if}
  <input
    bind:this={ref}
    bind:value
    aria-invalid={invalid ? 'true' : undefined}
    class="hp-input w-full min-w-0 rounded-xs px-2.5 text-fg-1 {size === 'lg' ? 'h-10' : 'h-8'} {mono ? 'font-mono text-[13px]' : 'text-sm'} {inputClass}"
    class:pl-8={leading}
    class:pr-12={suffix}
    {...rest}
  />
  {#if suffix}
    <span class="pointer-events-none absolute right-2.5 text-[13px] text-fg-3">{suffix}</span>
  {/if}
</div>

<style>
  .hp-input {
    background: var(--hp-bg-sunken);
    border: 1px solid var(--hp-line-control);
    transition: border-color var(--hp-dur-hover) ease;
  }

  .hp-input::placeholder {
    color: var(--hp-fg-3);
  }

  .hp-input:hover:not(:disabled) {
    border-color: var(--hp-fg-3);
  }

  .hp-input:focus-visible {
    outline: none;
    border-color: var(--hp-accent);
    box-shadow: 0 0 0 1px var(--hp-accent);
  }

  .hp-input[aria-invalid="true"] {
    border-color: var(--hp-negative);
  }

  .hp-input:disabled {
    background: var(--hp-bg-1);
    border-color: var(--hp-line-1);
    color: var(--hp-fg-2);
    cursor: not-allowed;
  }

  /* Number spinners fight the suffix and the mono alignment */
  .hp-input[type="number"] {
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .hp-input[type="number"]::-webkit-inner-spin-button,
  .hp-input[type="number"]::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }
</style>
