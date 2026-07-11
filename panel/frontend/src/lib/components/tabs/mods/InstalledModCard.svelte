<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import { emit } from '$lib/services/socketClient';
import { confirmDialog } from '$lib/stores/confirm';
import type { InstalledMod, ModUpdate } from '$lib/types';
import { classificationClass, getModUrl, toggleMod, updateMod } from './modActions';

const { mod, updateInfo }: { mod: InstalledMod; updateInfo?: ModUpdate } = $props();

const modUrl = $derived(getModUrl(mod));
let iconError = $state(false);

async function uninstall(): Promise<void> {
  if (await confirmDialog($_('confirmUninstall'), { danger: true })) {
    emit('mods:uninstall', mod.id);
  }
}
</script>

<div
  class="flex items-start gap-4 p-4 rounded-xl bg-panel-light border transition-colors
         {updateInfo ? 'border-hytale-gold/60 hover:border-hytale-gold' : 'border-panel-border hover:border-panel-border-light'}"
>
  <!-- Icon -->
  <div class="w-14 h-14 shrink-0 rounded-lg bg-panel-bg border border-panel-border flex items-center justify-center overflow-hidden">
    {#if mod.projectIconUrl && !iconError}
      <img
        src={mod.projectIconUrl}
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
        <a href={modUrl} target="_blank" rel="noopener noreferrer" class="text-hytale-gold hover:underline">{mod.projectTitle}</a>
      {:else}
        <span class="text-text">{mod.projectTitle}</span>
      {/if}
      <span class="px-1.5 py-0.5 text-xs rounded border {classificationClass(mod.classification)}">{mod.classification}</span>
      {#if mod.providerId === 'curseforge'}
        <span class="px-1.5 py-0.5 text-xs rounded bg-[#f16436]/20 border border-[#f16436]/50 text-[#f16436]">CF</span>
      {/if}
      {#if updateInfo}
        <span class="px-1.5 py-0.5 text-xs rounded bg-hytale-gold/20 border border-hytale-gold text-hytale-gold animate-pulse">
          {$_('updateAvailable')}
        </span>
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-3 text-sm text-text-muted">
      <span>v{mod.versionName}</span>
      {#if updateInfo}
        <span class="text-hytale-gold">→ v{updateInfo.latestVersion}</span>
      {/if}
      <span class:text-grass-light={mod.enabled} class:text-error={!mod.enabled}>
        {mod.enabled ? '● Enabled' : '○ Disabled'}
      </span>
      {#if mod.isLocal}
        <span class="px-1.5 py-0.5 text-xs rounded bg-panel-bg border border-panel-border">{$_('modLocal')}</span>
      {/if}
    </div>
  </div>

  <!-- Actions -->
  <div class="flex items-center gap-2 shrink-0">
    {#if updateInfo}
      {#if updateInfo.manualOnly && modUrl}
        <a
          href={modUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="mc-btn mc-btn-sm mc-btn-warning"
          title={$_('modNoDistribution')}
        >
          ↗ {$_('manualDownload')}
        </a>
      {:else}
        <Button size="small" variant="primary" onclick={() => updateMod(mod, updateInfo)}>
          ⬆ {$_('update')}
        </Button>
      {/if}
    {/if}
    <button
      type="button"
      class="w-11 h-6 rounded-sm border transition-colors relative
             {mod.enabled ? 'bg-success/70 border-success' : 'bg-panel-bg border-panel-border-light'}"
      role="switch"
      aria-checked={mod.enabled}
      onclick={() => toggleMod(mod)}
      title={mod.enabled ? $_('disable') : $_('enable')}
    >
      <span
        class="absolute top-0.5 w-4.5 h-4.5 rounded-xs bg-text transition-all {mod.enabled ? 'right-0.5' : 'left-0.5'}"
      ></span>
    </button>
    <Button size="small" variant="danger" onclick={uninstall} aria-label={$_('confirmUninstall')}>✕</Button>
  </div>
</div>
