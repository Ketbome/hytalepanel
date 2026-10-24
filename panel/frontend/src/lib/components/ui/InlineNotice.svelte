<script lang="ts">
import type { Snippet } from 'svelte';
import Icon, { type IconName } from './Icon.svelte';

interface Props {
  kind?: 'info' | 'warning' | 'negative' | 'positive';
  title?: string;
  class?: string;
  children?: Snippet;
  action?: Snippet;
}

const { kind = 'info', title, class: className = '', children, action }: Props = $props();

const styles: Record<string, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: 'bg-info-bg', fg: 'text-info', icon: 'info' },
  warning: { bg: 'bg-warning-bg', fg: 'text-warning', icon: 'triangle-alert' },
  negative: { bg: 'bg-negative-bg', fg: 'text-negative', icon: 'circle-alert' },
  positive: { bg: 'bg-positive-bg', fg: 'text-positive', icon: 'circle-check' }
};
const style = $derived(styles[kind]);
</script>

<div class="flex items-start gap-2.5 rounded-md px-3 py-2.5 {style.bg} {className}">
  <span class="{style.fg} pt-0.5"><Icon name={style.icon} /></span>
  <div class="flex-1 min-w-0 text-[13px] leading-5 text-fg-1 [overflow-wrap:anywhere]">
    {#if title}<p class="font-semibold">{title}</p>{/if}
    {@render children?.()}
  </div>
  {#if action}
    <div class="shrink-0 -my-0.5">{@render action()}</div>
  {/if}
</div>
