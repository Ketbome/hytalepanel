<script lang="ts">
interface Props {
  value: number;
  label: string;
  class?: string;
}

const { value, label, class: className = '' }: Props = $props();

let track = $state<HTMLDivElement | null>(null);
let cells = $state(24);
const pct = $derived(Math.max(0, Math.min(100, Math.round(value))));
const filled = $derived(Math.round((pct / 100) * cells));

// Cell count follows the track width: 6px cells, 2px gap
$effect(() => {
  if (!track) return;
  const observer = new ResizeObserver(([entry]) => {
    cells = Math.max(4, Math.floor((entry.contentRect.width + 2) / 8));
  });
  observer.observe(track);
  return () => observer.disconnect();
});
</script>

<div
  class="flex items-center gap-3 {className}"
  role="progressbar"
  aria-label={label}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={pct}
>
  <div bind:this={track} class="flex-1 min-w-0 flex gap-0.5 overflow-hidden">
    {#each Array(cells) as _cell, i}
      <span class="w-1.5 h-2 shrink-0 {i < filled ? 'bg-accent' : 'bg-raised'}"></span>
    {/each}
  </div>
  <span class="font-mono text-xs tabular-nums text-fg-2 w-9 text-right">{pct}%</span>
</div>
