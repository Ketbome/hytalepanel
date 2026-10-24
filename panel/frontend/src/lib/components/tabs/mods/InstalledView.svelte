<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import InlineNotice from '$lib/components/ui/InlineNotice.svelte';
import Skeleton from '$lib/components/ui/Skeleton.svelte';
import { availableUpdates, installedError, installedMods, isModsLoading } from '$lib/stores/mods';
import InstalledModCard from './InstalledModCard.svelte';
import { loadInstalledMods, switchView } from './modActions';
</script>

{#if $installedError}
  <InlineNotice kind="negative" title={$_('modsLoadError')}>
    <span class="text-fg-3">{$installedError}</span>
    {#snippet action()}
      <Button variant="ghost" size="sm" onclick={loadInstalledMods}>{$_('retry')}</Button>
    {/snippet}
  </InlineNotice>
{/if}

<ul class="hp-list -mx-2">
  {#if $isModsLoading}
    {#each Array(4) as _item}
      <li class="flex h-16 items-center gap-3 px-2" aria-hidden="true">
        <Skeleton width="40px" height="40px" />
        <span class="flex flex-1 flex-col gap-2"><Skeleton width="45%" /><Skeleton width="25%" height="8px" /></span>
      </li>
    {/each}
  {:else if $installedMods.length === 0 && !$installedError}
    <li class="flex flex-col items-start gap-2 px-2 py-6 text-sm text-fg-2">
      {$_('noModsInstalled')}
      <Button variant="ghost" size="sm" class="-ml-2.5" onclick={() => switchView('browse')}>{$_('browseMods')}</Button>
    </li>
  {:else}
    {#each $installedMods as mod (mod.id)}
      <InstalledModCard {mod} updateInfo={$availableUpdates.find((u) => u.modId === mod.id)} />
    {/each}
  {/if}
</ul>
