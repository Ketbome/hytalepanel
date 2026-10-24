<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  title: string;
  /** Count or short meta next to the title, in fg-3 */
  meta?: string | number;
  class?: string;
  actions?: Snippet;
  children?: Snippet;
}

const { title, meta, class: className = '', actions, children }: Props = $props();
</script>

<section class={className}>
  <div class="mb-2 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-2">
    <h3 class="text-base font-semibold text-fg-1">
      {title}
      {#if meta !== undefined}<span class="ml-1.5 font-mono text-[13px] font-normal text-fg-3">{meta}</span>{/if}
    </h3>
    {#if actions}
      <div class="ml-auto flex items-center gap-2">{@render actions()}</div>
    {/if}
  </div>
  {@render children?.()}
</section>
