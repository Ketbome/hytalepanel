<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  kind?: 'neutral' | 'positive' | 'negative' | 'warning' | 'info';
  title?: string;
  class?: string;
  children?: Snippet;
}

const { kind = 'neutral', title, class: className = '', children }: Props = $props();

const kinds = {
  neutral: 'bg-raised text-fg-2',
  positive: 'bg-positive-bg text-positive',
  negative: 'bg-negative-bg text-negative',
  warning: 'bg-warning-bg text-warning',
  info: 'bg-info-bg text-info'
};
</script>

<span
  class="inline-flex flex-none items-center gap-1 h-5 px-1.5 rounded-xs text-xs font-medium whitespace-nowrap {kinds[kind]} {className}"
  {title}
>
  {@render children?.()}
</span>
