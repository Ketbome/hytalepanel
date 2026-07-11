<script lang="ts">
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import { emit } from '$lib/services/socketClient';
import { currentProvider, currentView, curseforgeStatus, modtaleStatus } from '$lib/stores/mods';
import { showToast } from '$lib/stores/ui';
import BrowseView from './mods/BrowseView.svelte';
import InstalledView from './mods/InstalledView.svelte';
import { switchView } from './mods/modActions';

let isCheckingUpdates = $state(false);

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
  const mtStatus = get(modtaleStatus);
  const cfStatus = get(curseforgeStatus);
  const hasModtale = mtStatus.configured && mtStatus.valid;
  const hasCurseforge = cfStatus.configured && cfStatus.valid;

  if (!hasModtale && !hasCurseforge) {
    showToast(get(_)('updatesRequireApi'), 'error');
    return;
  }
  isCheckingUpdates = true;
  emit('mods:check-updates');
  setTimeout(() => {
    isCheckingUpdates = false;
  }, 5000);
}

function apiChipClass(status: { configured: boolean; valid: boolean }): string {
  if (status.valid) return 'bg-success/15 border-success/40 text-grass-light';
  if (status.configured) return 'bg-error/15 border-error/40 text-error';
  return 'bg-panel-bg border-panel-border text-text-dim';
}
</script>

<div class="space-y-3">
  <!-- View Toggle & API Status -->
  <div class="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-lg bg-panel-light border border-panel-border">
    <!-- API Status -->
    <div class="flex items-center gap-2">
      <span
        class="px-2 py-1 text-xs rounded border cursor-default {apiChipClass($modtaleStatus)}"
        title={$modtaleStatus.valid
          ? 'Modtale: OK'
          : $modtaleStatus.configured
            ? `Modtale: ${$modtaleStatus.error || 'Invalid'}`
            : 'Modtale: Not configured'}
      >
        M
      </span>
      <span
        class="px-2 py-1 text-xs rounded border cursor-default {apiChipClass($curseforgeStatus)}"
        title={$curseforgeStatus.valid
          ? 'CurseForge: OK'
          : $curseforgeStatus.configured
            ? `CurseForge: ${$curseforgeStatus.error || 'Invalid'}`
            : 'CurseForge: Not configured'}
      >
        CF
      </span>
    </div>

    <!-- View Buttons -->
    <div class="flex items-center gap-2">
      <Button variant="tab" active={$currentView === 'installed'} onclick={() => switchView('installed')}>
        📦 {$_('local')}
      </Button>
      <Button variant="tab" active={$currentView === 'browse'} onclick={() => switchView('browse')}>
        🌐 {$_('browse')}
      </Button>
      <Button size="small" variant="warning" onclick={checkForUpdates} disabled={isCheckingUpdates}>
        ⟳ {$_('checkUpdates')}
      </Button>
    </div>
  </div>

  {#if $currentView === 'installed'}
    <InstalledView />
  {:else}
    <BrowseView />
  {/if}
</div>
