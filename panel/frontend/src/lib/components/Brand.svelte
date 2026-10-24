<script lang="ts">
import { assetUrl } from '$lib/stores/config';

const { wordmark = true, size = 20 }: { wordmark?: boolean; size?: number } = $props();
</script>

<span class="inline-flex items-center gap-2">
  <img src={assetUrl('/images/hytale.png')} alt={wordmark ? '' : 'HytalePanel'} width={size} height={size} class="shrink-0 object-contain" />
  {#if wordmark}
    <span class="font-display text-[15px] leading-5 font-semibold tracking-[-0.01em] text-fg-1">HytalePanel</span>
  {/if}
</span>
