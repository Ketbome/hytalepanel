<script lang="ts">
interface Props {
  size?: 'sm' | 'md';
  label?: string;
  class?: string;
}

const { size = 'sm', label, class: className = '' }: Props = $props();
const block = $derived(size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5');
</script>

<span
  class="hp-block-loader inline-flex shrink-0 items-center gap-0.5 {className}"
  role={label ? 'status' : undefined}
  aria-hidden={label ? undefined : 'true'}
>
  <span class={block}></span>
  <span class={block}></span>
  <span class={block}></span>
  {#if label}<span class="hp-sr-only">{label}</span>{/if}
</span>
