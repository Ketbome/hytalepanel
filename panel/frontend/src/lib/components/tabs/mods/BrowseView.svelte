<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Input from '$lib/components/ui/Input.svelte';
import Select from '$lib/components/ui/Select.svelte';
import Skeleton from '$lib/components/ui/Skeleton.svelte';
import {
  classificationFilter,
  currentPage,
  currentProvider,
  curseforgeStatus,
  hasMore,
  isModsLoading,
  modtaleStatus,
  searchQuery,
  searchResults
} from '$lib/stores/mods';
import BrowseModCard from './BrowseModCard.svelte';
import { changePage, searchMods, switchProvider } from './modActions';
</script>

<!-- Provider Toggle -->
<div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel-light border border-panel-border">
  <span class="text-sm text-text-dim mr-2">{$_('providerLabel')}</span>
  <button
    type="button"
    class="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors
           {$currentProvider === 'modtale'
      ? 'bg-info/15 border-info/50 text-info'
      : 'bg-panel-bg border-panel-border text-text-muted hover:bg-panel-lighter'}
           {!$modtaleStatus.configured || !$modtaleStatus.valid ? 'opacity-50' : ''}"
    aria-pressed={$currentProvider === 'modtale'}
    onclick={() => switchProvider('modtale')}
    title={$modtaleStatus.valid ? 'Modtale API ready' : $modtaleStatus.configured ? 'API key invalid' : 'API key not configured'}
  >
    <span class="w-2 h-2 rounded-full {$modtaleStatus.valid ? 'bg-success' : $modtaleStatus.configured ? 'bg-error' : 'bg-stone'}"></span>
    Modtale
  </button>
  <button
    type="button"
    class="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors
           {$currentProvider === 'curseforge'
      ? 'bg-[#f16436]/15 border-[#f16436]/60 text-[#f16436]'
      : 'bg-panel-bg border-panel-border text-text-muted hover:bg-panel-lighter'}
           {!$curseforgeStatus.configured || !$curseforgeStatus.valid ? 'opacity-50' : ''}"
    aria-pressed={$currentProvider === 'curseforge'}
    onclick={() => switchProvider('curseforge')}
    title={$curseforgeStatus.valid ? 'CurseForge API ready' : $curseforgeStatus.configured ? 'API key invalid' : 'API key not configured'}
  >
    <span class="w-2 h-2 rounded-full {$curseforgeStatus.valid ? 'bg-success' : $curseforgeStatus.configured ? 'bg-error' : 'bg-stone'}"></span>
    CurseForge
  </button>
</div>

<!-- Search Bar -->
<div class="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-panel-light border border-panel-border">
  <div class="flex-1 min-w-[200px]">
    <Input
      type="text"
      class="!py-2 !text-sm"
      placeholder={$_('searchForMods')}
      aria-label={$_('searchForMods')}
      bind:value={$searchQuery}
      onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && searchMods()}
    />
  </div>
  {#if $currentProvider === 'modtale'}
    <Select class="!w-auto !py-2 !text-sm" aria-label={$_('allTypes')} bind:value={$classificationFilter} onchange={() => searchMods()}>
      <option value="">{$_('allTypes')}</option>
      <option value="PLUGIN">{$_('typePlugin')}</option>
      <option value="DATA">{$_('typeData')}</option>
      <option value="ART">{$_('typeArt')}</option>
      <option value="SAVE">{$_('typeSave')}</option>
      <option value="MODPACK">{$_('typeModpack')}</option>
    </Select>
  {/if}
  <Button size="small" variant="primary" onclick={() => searchMods()}>🔍 {$_('search')}</Button>
</div>

<!-- Results -->
<div class="space-y-2">
  {#if $isModsLoading}
    {#each Array(4) as _item}
      <Skeleton type="card" />
    {/each}
  {:else if $searchResults.length === 0}
    <div class="px-4 py-8 text-center rounded-xl bg-panel-light border border-panel-border">
      <div class="text-3xl mb-2">🔍</div>
      <div class="text-text-dim">{$_('noModsFound')}</div>
    </div>
  {:else}
    {#each $searchResults as mod}
      <BrowseModCard {mod} />
    {/each}
  {/if}
</div>

<!-- Pagination -->
{#if $searchResults.length > 0}
  <div class="flex items-center justify-center gap-4 px-4 py-3 rounded-lg bg-panel-light border border-panel-border">
    <Button size="small" onclick={() => changePage(-1)} disabled={$currentPage <= 1}>◀ {$_('prev')}</Button>
    <span class="text-sm text-text-muted">{$_('page')} {$currentPage}</span>
    <Button size="small" onclick={() => changePage(1)} disabled={!$hasMore}>{$_('next')} ▶</Button>
  </div>
{/if}
