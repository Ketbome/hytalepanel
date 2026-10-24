<script lang="ts" generics="T extends string">
import Icon, { type IconName } from './Icon.svelte';

interface Option {
  value: T;
  label: string;
  icon?: IconName;
  /** Label hidden visually, kept for screen readers (icon segments) */
  iconOnly?: boolean;
  count?: number;
  title?: string;
}

interface Props {
  options: Option[];
  value: T;
  label: string;
  size?: 'sm' | 'md';
  class?: string;
  onchange: (value: T) => void;
}

const { options, value, label, size = 'md', class: className = '', onchange }: Props = $props();

let groupEl = $state<HTMLDivElement | null>(null);

function handleKeydown(e: KeyboardEvent): void {
  const index = options.findIndex((o) => o.value === value);
  let next = index;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % options.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = options.length - 1;
  else return;
  e.preventDefault();
  onchange(options[next].value);
  groupEl?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
}
</script>

<div
  bind:this={groupEl}
  class="inline-flex shrink-0 gap-0.5 rounded-xs border border-line bg-sunken p-0.5 {className}"
  role="radiogroup"
  aria-label={label}
  tabindex="-1"
  onkeydown={handleKeydown}
>
  {#each options as option (option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={option.value === value}
      aria-label={option.iconOnly ? option.label : undefined}
      title={option.title ?? (option.iconOnly ? option.label : undefined)}
      tabindex={option.value === value ? 0 : -1}
      class="hp-seg inline-flex items-center justify-center gap-1.5 rounded-xs text-[13px] font-medium whitespace-nowrap
             {size === 'sm' ? 'h-6' : 'h-7'} {option.iconOnly ? (size === 'sm' ? 'w-6' : 'w-7') : 'px-2.5'}"
      onclick={() => onchange(option.value)}
    >
      {#if option.icon}<Icon name={option.icon} size={14} />{/if}
      {#if !option.iconOnly}<span>{option.label}</span>{/if}
      {#if option.count}
        <span class="font-mono text-xs tabular-nums text-fg-3">{option.count}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .hp-seg {
    color: var(--hp-fg-2);
    transition:
      background-color var(--hp-dur-hover) ease,
      color var(--hp-dur-hover) ease;
  }

  .hp-seg:hover {
    color: var(--hp-fg-1);
  }

  .hp-seg[aria-checked="true"] {
    background: var(--hp-bg-3);
    color: var(--hp-fg-1);
  }
</style>
