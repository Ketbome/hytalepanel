<script lang="ts">
import { _ } from 'svelte-i18n';
import Skeleton from '$lib/components/ui/Skeleton.svelte';
import { availableUpdates, installedMods, isModsLoading } from '$lib/stores/mods';
import InstalledModCard from './InstalledModCard.svelte';
</script>

<div class="space-y-2">
  {#if $isModsLoading}
    {#each Array(3) as _item}
      <Skeleton type="card" />
    {/each}
  {:else if $installedMods.length === 0}
    <div class="px-4 py-8 text-center rounded-xl bg-panel-light border border-panel-border">
      <div class="text-3xl mb-2">📭</div>
      <div class="text-text-dim">{$_('noModsInstalled')}</div>
    </div>
  {:else}
    {#each $installedMods as mod}
      <InstalledModCard {mod} updateInfo={$availableUpdates.find((u) => u.modId === mod.id)} />
    {/each}
  {/if}
</div>
