<script lang="ts" generics="T extends string">
interface Tab {
  id: T;
  label: string;
}

interface Props {
  tabs: Tab[];
  selected: T;
  /** Prefix shared with the panels: `${idPrefix}-tab-${id}` / `${idPrefix}-panel-${id}` */
  idPrefix: string;
  label: string;
  class?: string;
  onselect: (id: T) => void;
}

const { tabs, selected, idPrefix, label, class: className = '', onselect }: Props = $props();

let listEl = $state<HTMLDivElement | null>(null);
let indicator = $state({ x: 0, w: 0 });
let ready = $state(false);

function measure(): void {
  const active = listEl?.querySelector<HTMLElement>(`[aria-selected="true"]`);
  if (!active || !listEl) return;
  indicator = { x: active.offsetLeft, w: active.offsetWidth };
  // Keep the selected tab in view when the row scrolls sideways (long locales, phones)
  const right = active.offsetLeft + active.offsetWidth;
  if (active.offsetLeft < listEl.scrollLeft) listEl.scrollLeft = active.offsetLeft;
  else if (right > listEl.scrollLeft + listEl.clientWidth) listEl.scrollLeft = right - listEl.clientWidth;
}

$effect(() => {
  selected;
  tabs;
  measure();
  // First placement must not animate (no motion on load)
  if (!ready) requestAnimationFrame(() => (ready = true));
});

$effect(() => {
  if (!listEl) return;
  const observer = new ResizeObserver(measure);
  observer.observe(listEl);
  return () => observer.disconnect();
});

function handleKeydown(e: KeyboardEvent): void {
  const index = tabs.findIndex((t) => t.id === selected);
  let next = index;
  if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
  else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = tabs.length - 1;
  else return;
  e.preventDefault();
  onselect(tabs[next].id);
  listEl?.querySelector<HTMLElement>(`#${idPrefix}-tab-${tabs[next].id}`)?.focus();
}
</script>

<div
  bind:this={listEl}
  class="relative flex overflow-x-auto [scrollbar-width:none] {className}"
  role="tablist"
  aria-label={label}
  tabindex="-1"
  onkeydown={handleKeydown}
>
  {#each tabs as tab (tab.id)}
    <button
      type="button"
      role="tab"
      id="{idPrefix}-tab-{tab.id}"
      aria-selected={tab.id === selected}
      aria-controls="{idPrefix}-panel-{tab.id}"
      tabindex={tab.id === selected ? 0 : -1}
      class="hp-tab h-10 shrink-0 px-3 text-sm font-medium whitespace-nowrap"
      onclick={() => onselect(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
  <span
    class="hp-tab-indicator pointer-events-none absolute bottom-0 left-0 h-0.5 w-px bg-accent"
    class:ready
    style="transform: translateX({indicator.x}px) scaleX({indicator.w})"
    aria-hidden="true"
  ></span>
</div>

<style>
  .hp-tab {
    color: var(--hp-fg-2);
    transition: color var(--hp-dur-hover) ease;
  }

  .hp-tab:hover,
  .hp-tab[aria-selected="true"] {
    color: var(--hp-fg-1);
  }

  .hp-tab:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--hp-accent);
  }

  .hp-tab-indicator {
    transform-origin: left;
  }

  .hp-tab-indicator.ready {
    transition: transform var(--hp-dur-ui) var(--hp-ease-out);
  }
</style>
