<script lang="ts">
import { _ } from 'svelte-i18n';
import { assetUrl } from '$lib/stores/config';

const { size = 'md' }: { size?: 'md' | 'lg' } = $props();
</script>

<div class="flex items-center {size === 'lg' ? 'gap-4' : 'gap-3'}">
  <img
    src={assetUrl('/images/hytale.png')}
    alt="HytalePanel"
    class="object-contain {size === 'lg' ? 'w-16 h-16' : 'w-11 h-11'}"
  />
  <div class="text-left">
    <h1 class="font-display text-hytale-gold tracking-wider {size === 'lg' ? 'text-xl' : 'text-sm'}">
      HYTALEPANEL
    </h1>
    <p class="text-text-muted {size === 'lg' ? 'text-sm mt-1' : 'text-xs'}">{$_('serverPanel')}</p>
  </div>
</div>
