<script lang="ts" module>
import type { UiStatus } from '$lib/utils/status';
import type { IconName } from './Icon.svelte';

export type MenuEntry =
  | {
      kind?: 'item';
      label: string;
      icon?: IconName;
      /** Machine value on the right, set in mono (ports, versions) */
      meta?: string;
      danger?: boolean;
      checked?: boolean;
      disabled?: boolean;
      href?: string;
      onselect?: () => void;
      /** Leading status square (server lists) */
      status?: UiStatus;
    }
  | { kind: 'separator' }
  | { kind: 'label'; label: string };
</script>

<script lang="ts">
import type { Snippet } from 'svelte';
import { fade } from 'svelte/transition';
import Icon from './Icon.svelte';
import StatusSquare from './StatusSquare.svelte';

interface TriggerProps {
  id: string;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls': string;
  onclick: () => void;
  onkeydown: (e: KeyboardEvent) => void;
}

interface Props {
  items: MenuEntry[];
  label: string;
  align?: 'start' | 'end';
  placement?: 'bottom' | 'top';
  minWidth?: string;
  class?: string;
  trigger: Snippet<[TriggerProps]>;
}

const { items, label, align = 'start', placement = 'bottom', minWidth = '200px', class: className = '', trigger }: Props = $props();

const uid = $props.id();
let open = $state(false);
let rootEl = $state<HTMLDivElement | null>(null);
let menuEl = $state<HTMLDivElement | null>(null);
let typeahead = '';
let typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

function menuItems(): HTMLElement[] {
  return Array.from(menuEl?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? []);
}

function triggerEl(): HTMLElement | null {
  return rootEl?.querySelector<HTMLElement>(`#${uid}-trigger`) ?? null;
}

function openMenu(focus: 'first' | 'last' = 'first'): void {
  open = true;
  requestAnimationFrame(() => {
    const list = menuItems();
    const checked = list.find((el) => el.getAttribute('aria-checked') === 'true');
    (checked ?? (focus === 'first' ? list[0] : list[list.length - 1]))?.focus();
  });
}

function close(returnFocus = true): void {
  if (!open) return;
  open = false;
  if (returnFocus) triggerEl()?.focus();
}

function select(entry: MenuEntry): void {
  if (entry.kind === 'separator' || entry.kind === 'label' || entry.disabled) return;
  close(!entry.href);
  entry.onselect?.();
}

function handleTriggerKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openMenu('first');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    openMenu('last');
  }
}

function handleMenuKeydown(e: KeyboardEvent): void {
  const list = menuItems();
  const index = list.indexOf(document.activeElement as HTMLElement);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    list[(index + 1) % list.length]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    list[(index - 1 + list.length) % list.length]?.focus();
  } else if (e.key === 'Home') {
    e.preventDefault();
    list[0]?.focus();
  } else if (e.key === 'End') {
    e.preventDefault();
    list[list.length - 1]?.focus();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    close();
  } else if (e.key === 'Tab') {
    close(false);
  } else if (e.key.length === 1 && /\S/.test(e.key)) {
    typeahead += e.key.toLowerCase();
    if (typeaheadTimer) clearTimeout(typeaheadTimer);
    typeaheadTimer = setTimeout(() => (typeahead = ''), 500);
    list.find((el) => el.textContent?.trim().toLowerCase().startsWith(typeahead))?.focus();
  }
}

$effect(() => {
  if (!open) return;
  const onPointer = (e: PointerEvent) => {
    if (rootEl && !rootEl.contains(e.target as Node)) close(false);
  };
  document.addEventListener('pointerdown', onPointer);
  return () => document.removeEventListener('pointerdown', onPointer);
});
</script>

<div bind:this={rootEl} class="relative inline-flex min-w-0 {className}">
  {@render trigger({
    id: `${uid}-trigger`,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': `${uid}-menu`,
    onclick: () => (open ? close() : openMenu()),
    onkeydown: handleTriggerKeydown
  })}

  {#if open}
    <div
      bind:this={menuEl}
      id="{uid}-menu"
      class="hp-menu hp-motion-scale absolute z-30 flex flex-col bg-overlay border border-line-2 rounded-md shadow-menu p-1
             {align === 'end' ? 'right-0' : 'left-0'} {placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}"
      style="min-width: {minWidth}; transform-origin: {placement === 'top' ? 'bottom' : 'top'} {align === 'end' ? 'right' : 'left'}"
      role="menu"
      aria-label={label}
      tabindex="-1"
      onkeydown={handleMenuKeydown}
      out:fade={{ duration: 140 }}
    >
      {#each items as entry, i (i)}
        {#if entry.kind === 'separator'}
          <div class="my-1 h-px bg-line-2" role="separator"></div>
        {:else if entry.kind === 'label'}
          <div class="px-2 pt-1.5 pb-1 text-xs text-fg-3" role="presentation">{entry.label}</div>
        {:else}
          {@const role = entry.checked !== undefined ? 'menuitemradio' : 'menuitem'}
          {#if entry.href}
            <a
              href={entry.href}
              target="_blank"
              rel="noopener noreferrer"
              class="hp-item"
              {role}
              tabindex="-1"
              onclick={() => select(entry)}
            >
              {@render itemContent(entry)}
            </a>
          {:else}
            <button
              type="button"
              class="hp-item"
              class:danger={entry.danger}
              {role}
              aria-checked={entry.checked}
              aria-disabled={entry.disabled ? 'true' : undefined}
              tabindex="-1"
              onclick={() => select(entry)}
            >
              {@render itemContent(entry)}
            </button>
          {/if}
        {/if}
      {/each}
    </div>
  {/if}
</div>

{#snippet itemContent(entry: Extract<MenuEntry, { label: string; kind?: 'item' }>)}
  {#if entry.status}
    <span class="flex w-4 shrink-0 justify-center"><StatusSquare status={entry.status} /></span>
  {:else if entry.icon}
    <span class="hp-item-icon flex shrink-0"><Icon name={entry.icon} /></span>
  {:else if entry.checked !== undefined}
    <span class="flex w-4 shrink-0 text-fg-2">{#if entry.checked}<Icon name="check" />{/if}</span>
  {/if}
  <span class="min-w-0 flex-1 truncate text-left">{entry.label}</span>
  {#if entry.meta}<span class="shrink-0 font-mono text-xs text-fg-3">{entry.meta}</span>{/if}
  {#if entry.href}<span class="hp-item-icon flex shrink-0"><Icon name="external-link" size={14} /></span>{/if}
{/snippet}

<style>
  .hp-menu {
    max-width: min(320px, calc(100vw - 32px));
    transition:
      opacity var(--hp-dur-ui) var(--hp-ease-out),
      transform var(--hp-dur-ui) var(--hp-ease-out);
  }

  @starting-style {
    .hp-menu {
      opacity: 0;
      transform: scale(0.97);
    }
  }

  .hp-item {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 8px;
    border-radius: var(--hp-radius-2);
    font-size: 14px;
    color: var(--hp-fg-1);
    white-space: nowrap;
    cursor: pointer;
    transition: background-color var(--hp-dur-hover) ease;
  }

  .hp-item:hover,
  .hp-item:focus-visible {
    background: var(--hp-bg-2);
    outline: none;
  }

  .hp-item[aria-disabled="true"] {
    color: var(--hp-fg-3);
    cursor: not-allowed;
  }

  .hp-item.danger {
    color: var(--hp-negative);
  }

  .hp-item-icon {
    color: var(--hp-fg-3);
  }

  .hp-item.danger .hp-item-icon {
    color: var(--hp-negative);
  }
</style>
