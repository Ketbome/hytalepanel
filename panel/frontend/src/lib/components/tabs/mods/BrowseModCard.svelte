<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import { installedMods } from '$lib/stores/mods';
import type { ModProject } from '$lib/types';
import { formatNumber } from '$lib/utils/formatters';
import { classificationClass, getModUrl, installMod } from './modActions';

const { mod }: { mod: ModProject } = $props();

const alreadyInstalled = $derived($installedMods.some((m) => m.projectId === mod.id));
let iconError = $state(false);
const latestVersion = $derived(mod.latestVersion || mod.versions?.[0]);
const modUrl = $derived(getModUrl(mod));
const noDistribution = $derived('allowDistribution' in mod && mod.allowDistribution === false);
</script>

<div
  class="flex items-start gap-4 p-4 rounded-xl bg-panel-light border border-panel-border transition-colors
         {noDistribution ? 'opacity-60' : 'hover:border-panel-border-light'}"
>
  <!-- Icon -->
  <div class="w-14 h-14 shrink-0 rounded-lg bg-panel-bg border border-panel-border flex items-center justify-center overflow-hidden">
    {#if mod.iconUrl && !iconError}
      <img
        src={mod.iconUrl}
        alt=""
        class="w-full h-full object-cover"
        onerror={() => (iconError = true)}
      />
    {:else}
      <span class="text-2xl text-text-dim">?</span>
    {/if}
  </div>

  <!-- Info -->
  <div class="flex-1 min-w-0">
    <div class="flex flex-wrap items-center gap-2 mb-1">
      {#if modUrl}
        <a href={modUrl} target="_blank" rel="noopener noreferrer" class="text-hytale-gold hover:underline">{mod.title}</a>
      {:else}
        <span class="text-text">{mod.title}</span>
      {/if}
      <span class="px-1.5 py-0.5 text-xs rounded border {classificationClass(mod.classification)}">{mod.classification}</span>
      {#if noDistribution}
        <span class="px-1.5 py-0.5 text-xs rounded bg-warning/20 border border-warning text-warning" title={$_('modNoDistribution')}>⚠</span>
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-3 text-sm text-text-muted mb-2">
      <span>{mod.author}</span>
      {#if mod.downloads}
        <span>📥 {formatNumber(mod.downloads)}</span>
      {/if}
      {#if latestVersion?.version}
        <span>v{latestVersion.version}</span>
      {/if}
    </div>
    {#if mod.shortDescription}
      <div class="text-sm text-text-dim line-clamp-2">{mod.shortDescription}</div>
    {/if}
  </div>

  <!-- Actions -->
  <div class="shrink-0">
    {#if noDistribution && modUrl}
      <a href={modUrl} target="_blank" rel="noopener noreferrer" class="mc-btn mc-btn-sm mc-btn-warning" title={$_('modNoDistribution')}>
        ↗ {$_('manualDownload')}
      </a>
    {:else}
      <Button
        size="small"
        variant={alreadyInstalled ? 'default' : 'primary'}
        onclick={() => installMod(mod)}
        disabled={alreadyInstalled || noDistribution}
      >
        {#if noDistribution}
          ⚠ {$_('manualOnly')}
        {:else if alreadyInstalled}
          ✓ {$_('installed')}
        {:else}
          ⬇ {$_('install')}
        {/if}
      </Button>
    {/if}
  </div>
</div>
