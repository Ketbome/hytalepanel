<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Segmented from '$lib/components/ui/Segmented.svelte';
import { emit } from '$lib/services/socketClient';
import {
  type ApiStatus,
  currentProvider,
  currentView,
  curseforgeStatus,
  installedMods,
  modtaleStatus
} from '$lib/stores/mods';
import BrowseView from './mods/BrowseView.svelte';
import InstalledView from './mods/InstalledView.svelte';
import { switchView } from './mods/modActions';

let isCheckingUpdates = $state(false);

const canCheckUpdates = $derived($modtaleStatus.valid || $curseforgeStatus.valid);

// Fall back to the other provider when the selected one is unusable
$effect(() => {
  const mt = $modtaleStatus;
  const cf = $curseforgeStatus;
  const provider = $currentProvider;

  if (provider === 'modtale' && (!mt.configured || !mt.valid)) {
    if (cf.configured && cf.valid) {
      currentProvider.set('curseforge');
    }
  } else if (provider === 'curseforge' && (!cf.configured || !cf.valid)) {
    if (mt.configured && mt.valid) {
      currentProvider.set('modtale');
    }
  }
});

function checkForUpdates(): void {
  if (!canCheckUpdates) return;
  isCheckingUpdates = true;
  emit('mods:check-updates');
  setTimeout(() => {
    isCheckingUpdates = false;
  }, 5000);
}

function providerTitle(name: string, status: ApiStatus): string {
  if (status.valid) return `${name}: ${$_('apiReady')}`;
  if (status.configured) return `${name}: ${status.error || $_('apiKeyInvalidShort')}`;
  return `${name}: ${$_('notConfigured')}`;
}
</script>

{#snippet provider(name: string, status: ApiStatus)}
  <span class="flex items-center gap-1.5 text-[13px] text-fg-2" title={providerTitle(name, status)}>
    <span
      class="h-1.5 w-1.5 shrink-0"
      class:bg-positive={status.valid}
      class:bg-negative={status.configured && !status.valid}
      class:hp-hollow={!status.configured}
      aria-hidden="true"
    ></span>
    {name}
    <span class="hp-sr-only">{providerTitle(name, status)}</span>
  </span>
{/snippet}

<div class="flex flex-col gap-4">
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <Segmented
      label={$_('mods')}
      value={$currentView === 'browse' ? 'browse' : 'installed'}
      onchange={(v) => switchView(v)}
      options={[
        { value: 'installed', label: $_('installed'), count: $installedMods.length },
        { value: 'browse', label: $_('browse') }
      ]}
    />
    <div class="ml-auto flex items-center gap-3">
      {@render provider('Modtale', $modtaleStatus)}
      {@render provider('CurseForge', $curseforgeStatus)}
      <Button
        variant="secondary"
        size="sm"
        loading={isCheckingUpdates}
        onclick={checkForUpdates}
        disabled={!canCheckUpdates}
        title={canCheckUpdates ? undefined : $_('updatesRequireApi')}
      >
        {$_('checkUpdates')}
      </Button>
    </div>
  </div>

  {#if $currentView === 'installed'}
    <InstalledView />
  {:else}
    <BrowseView />
  {/if}
</div>

<style>
  .hp-hollow {
    box-shadow: inset 0 0 0 1px var(--hp-fg-3);
  }
</style>
