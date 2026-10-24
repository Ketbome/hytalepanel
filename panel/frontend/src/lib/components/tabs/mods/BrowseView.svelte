<script lang="ts">
import { _ } from 'svelte-i18n';
import Button from '$lib/components/ui/Button.svelte';
import Icon from '$lib/components/ui/Icon.svelte';
import InlineNotice from '$lib/components/ui/InlineNotice.svelte';
import Input from '$lib/components/ui/Input.svelte';
import Segmented from '$lib/components/ui/Segmented.svelte';
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
  searchError,
  searchQuery,
  searchResults
} from '$lib/stores/mods';
import BrowseModCard from './BrowseModCard.svelte';
import { changePage, searchMods, switchProvider } from './modActions';

const DOCS_URL = 'https://hytalepanel.ketbome.com/';

const usable = $derived($modtaleStatus.valid || $curseforgeStatus.valid);
const invalidProvider = $derived(
  $modtaleStatus.configured && !$modtaleStatus.valid
    ? 'Modtale'
    : $curseforgeStatus.configured && !$curseforgeStatus.valid
      ? 'CurseForge'
      : null
);
</script>

{#if !usable}
  {#if invalidProvider}
    <InlineNotice kind="negative">
      {$_('apiKeyInvalid', { values: { provider: invalidProvider } })}
      {#snippet action()}
        <Button variant="ghost" size="sm" href={DOCS_URL} external trailingIcon="external-link">{$_('docs')}</Button>
      {/snippet}
    </InlineNotice>
  {:else}
    <InlineNotice kind="info">
      {$_('modSearchNeedsKey')}
      {#snippet action()}
        <Button variant="ghost" size="sm" href={DOCS_URL} external trailingIcon="external-link">{$_('docs')}</Button>
      {/snippet}
    </InlineNotice>
  {/if}
{:else}
  <form
    class="flex flex-wrap items-center gap-2"
    onsubmit={(e) => {
      e.preventDefault();
      searchMods();
    }}
  >
    <Input
      type="search"
      class="min-w-[160px] flex-1"
      placeholder={$_('searchForMods')}
      aria-label={$_('searchForMods')}
      bind:value={$searchQuery}
    >
      {#snippet leading()}<Icon name="search" />{/snippet}
    </Input>
    {#if $currentProvider === 'modtale'}
      <Select class="w-[132px]" aria-label={$_('modType')} bind:value={$classificationFilter} onchange={() => searchMods()}>
        <option value="">{$_('allTypes')}</option>
        <option value="PLUGIN">{$_('typePlugin')}</option>
        <option value="DATA">{$_('typeData')}</option>
        <option value="ART">{$_('typeArt')}</option>
        <option value="SAVE">{$_('typeSave')}</option>
        <option value="MODPACK">{$_('typeModpack')}</option>
      </Select>
    {/if}
    {#if $modtaleStatus.valid && $curseforgeStatus.valid}
      <Segmented
        label={$_('providerLabel')}
        value={$currentProvider}
        onchange={switchProvider}
        options={[
          { value: 'modtale', label: 'Modtale' },
          { value: 'curseforge', label: 'CurseForge' }
        ]}
      />
    {/if}
    <Button variant="secondary" type="submit">{$_('search')}</Button>
  </form>

  {#if $searchError}
    <InlineNotice kind="negative" title={$_('modSearchError')} class="mt-3">
      <span class="text-fg-3">{$searchError}</span>
      {#snippet action()}
        <Button variant="ghost" size="sm" onclick={() => searchMods($currentPage)}>{$_('retry')}</Button>
      {/snippet}
    </InlineNotice>
  {/if}

  <ul class="hp-list -mx-2 mt-3">
    {#if $isModsLoading}
      {#each Array(4) as _item}
        <li class="flex h-16 items-center gap-3 px-2" aria-hidden="true">
          <Skeleton width="40px" height="40px" />
          <span class="flex flex-1 flex-col gap-2"><Skeleton width="45%" /><Skeleton width="25%" height="8px" /></span>
        </li>
      {/each}
    {:else if $searchResults.length === 0 && !$searchError}
      <li class="px-2 py-6 text-sm text-fg-2">{$_('noModsFound')}</li>
    {:else}
      {#each $searchResults as mod (mod.id)}
        <BrowseModCard {mod} />
      {/each}
    {/if}
  </ul>

  {#if $searchResults.length > 0}
    <div class="mt-2 flex items-center justify-end gap-1">
      <span class="mr-2 text-[13px] text-fg-2">{$_('pageN', { values: { page: $currentPage } })}</span>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        icon="chevron-left"
        aria-label={$_('prev')}
        title={$_('prev')}
        onclick={() => changePage(-1)}
        disabled={$currentPage <= 1 || $isModsLoading}
      />
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        icon="chevron-right"
        aria-label={$_('next')}
        title={$_('next')}
        onclick={() => changePage(1)}
        disabled={!$hasMore || $isModsLoading}
      />
    </div>
  {/if}
{/if}
