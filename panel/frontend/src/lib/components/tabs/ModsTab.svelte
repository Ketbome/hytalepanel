<script lang="ts">
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { emit } from '$lib/services/socketClient';
import {
  apiConfigured,
  availableUpdates,
  cfApiConfigured,
  currentPage,
  currentProvider,
  currentView,
  curseforgeStatus,
  hasMore,
  installedMods,
  isModsLoading,
  type ModProvider,
  type ModView,
  modtaleStatus,
  searchResults
} from '$lib/stores/mods';
import { showToast } from '$lib/stores/ui';
import type { InstalledMod, ModProject, ModUpdate } from '$lib/types';
import { formatNumber } from '$lib/utils/formatters';

let searchQuery = $state('');
let classificationFilter = $state('');
let isCheckingUpdates = $state(false);
let initialBrowseLoad = $state(true);

function switchView(view: ModView): void {
  currentView.set(view);
  if (view === 'installed') {
    loadInstalledMods();
  } else if ($searchResults.length === 0 || initialBrowseLoad) {
    searchMods();
  }
}

function switchProvider(provider: ModProvider): void {
  currentProvider.set(provider);
  searchResults.set([]);
  currentPage.set(1);
  hasMore.set(false);
  initialBrowseLoad = true;
  if ($currentView === 'browse') {
    searchMods();
  }
}

function loadInstalledMods(): void {
  isModsLoading.set(true);
  emit('mods:list');
}

function checkConfig(): void {
  emit('mods:check-config');
  emit('cf:check-config');
}

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

function isCurrentApiConfigured(): boolean {
  const provider = get(currentProvider);
  return provider === 'modtale' ? get(apiConfigured) : get(cfApiConfigured);
}

function getApiErrorMessage(): string {
  const provider = get(currentProvider);
  const status = provider === 'curseforge' ? get(curseforgeStatus) : get(modtaleStatus);
  const providerName = provider === 'curseforge' ? 'CurseForge' : 'Modtale';

  if (!status.configured) {
    return get(_)('apiKeyNotConfigured', { values: { provider: providerName } });
  }
  if (!status.valid) {
    return get(_)('apiKeyInvalid', { values: { provider: providerName } });
  }
  return get(_)('configureApiFirst');
}

function searchMods(page = 1): void {
  if (!isCurrentApiConfigured()) {
    showToast(getApiErrorMessage(), 'error');
    return;
  }
  isModsLoading.set(true);
  initialBrowseLoad = false;

  const provider = get(currentProvider);
  if (provider === 'curseforge') {
    emit('cf:search', {
      query: searchQuery,
      page,
      pageSize: 20
    });
  } else {
    emit('mods:search', {
      query: searchQuery,
      classification: classificationFilter || undefined,
      page,
      pageSize: 20
    });
  }
}

function changePage(delta: number): void {
  const newPage = $currentPage + delta;
  if (newPage < 1) return;
  if (delta > 0 && !$hasMore) return;
  searchMods(newPage);
}

function installMod(mod: ModProject): void {
  if (!isCurrentApiConfigured()) {
    showToast(getApiErrorMessage(), 'error');
    return;
  }
  const provider = get(currentProvider);
  const latestVersion = mod.latestVersion || mod.versions?.[0];
  if (!latestVersion?.id) {
    if (provider === 'curseforge') {
      emit('cf:get', mod.id);
    } else {
      emit('mods:get', mod.id);
    }
    return;
  }

  if (provider === 'curseforge') {
    // Check if mod allows distribution
    if ('allowDistribution' in mod && mod.allowDistribution === false) {
      showToast(get(_)('modNoDistribution'), 'error');
      return;
    }
    emit('cf:install', {
      modId: mod.id,
      fileId: latestVersion.id,
      metadata: {
        projectTitle: mod.title,
        projectSlug: mod.slug,
        projectIconUrl: mod.iconUrl,
        versionName: latestVersion.version,
        classification: mod.classification,
        fileName: latestVersion.fileName
      }
    });
  } else {
    emit('mods:install', {
      projectId: mod.id,
      versionId: latestVersion.id,
      metadata: {
        projectTitle: mod.title,
        projectSlug: mod.slug,
        projectIconUrl: mod.iconUrl,
        versionName: latestVersion.version,
        classification: mod.classification,
        fileName: latestVersion.fileName
      }
    });
  }
}

function uninstallMod(modId: string): void {
  if (confirm($_('confirmUninstall'))) {
    emit('mods:uninstall', modId);
  }
}

function toggleMod(mod: InstalledMod): void {
  if (mod.enabled) {
    emit('mods:disable', mod.id);
  } else {
    emit('mods:enable', mod.id);
  }
}

function updateMod(mod: InstalledMod, updateInfo: ModUpdate): void {
  emit('mods:update', {
    modId: mod.id,
    versionId: updateInfo.latestVersionId,
    metadata: {
      versionName: updateInfo.latestVersion,
      fileName: updateInfo.latestFileName
    }
  });
}

function isModInstalled(projectId: string): boolean {
  return get(installedMods).some((m) => m.projectId === projectId);
}

function getUpdateInfo(modId: string): ModUpdate | undefined {
  return get(availableUpdates).find((u) => u.modId === modId);
}

function getModUrl(mod: InstalledMod | ModProject): string | null {
  if ('providerId' in mod) {
    // InstalledMod
    if (mod.providerId === 'curseforge' && mod.projectId) {
      return `https://www.curseforge.com/hytale/mods/${mod.projectSlug || mod.projectId}`;
    }
    if (mod.projectId && mod.projectSlug) {
      return `https://modtale.net/mod/${mod.projectSlug}-${mod.projectId}`;
    }
  } else {
    // ModProject from browse
    const provider = get(currentProvider);
    if (provider === 'curseforge') {
      return `https://www.curseforge.com/hytale/mods/${mod.slug}`;
    }
    return `https://modtale.net/mod/${mod.slug}-${mod.id}`;
  }
  return null;
}
</script>

<div class="mods-view-toggle">
  <div class="mods-api-status">
    <span
      class="mods-api-dot"
      class:ok={$modtaleStatus.valid}
      class:error={$modtaleStatus.configured && !$modtaleStatus.valid}
      title={$modtaleStatus.valid ? 'Modtale: OK' : $modtaleStatus.configured ? `Modtale: ${$modtaleStatus.error || 'Invalid'}` : 'Modtale: Not configured'}
    >M</span>
    <span
      class="mods-api-dot"
      class:ok={$curseforgeStatus.valid}
      class:error={$curseforgeStatus.configured && !$curseforgeStatus.valid}
      title={$curseforgeStatus.valid ? 'CurseForge: OK' : $curseforgeStatus.configured ? `CurseForge: ${$curseforgeStatus.error || 'Invalid'}` : 'CurseForge: Not configured'}
    >CF</span>
  </div>
  <button class="mc-btn small" class:active={$currentView === 'installed'} onclick={() => switchView('installed')}>
    {$_('local')}
  </button>
  <button class="mc-btn small" class:active={$currentView === 'browse'} onclick={() => switchView('browse')}>
    {$_('browse')}
  </button>
  <button class="mc-btn small" onclick={checkForUpdates} disabled={isCheckingUpdates}>
    ⟳ {$_('checkUpdates')}
  </button>
</div>

{#if $currentView === 'browse'}
  <div class="mods-provider-toggle">
    <button
      class="provider-btn"
      class:active={$currentProvider === 'modtale'}
      class:unavailable={!$modtaleStatus.configured || !$modtaleStatus.valid}
      onclick={() => switchProvider('modtale')}
      title={$modtaleStatus.valid ? 'Modtale API ready' : ($modtaleStatus.configured ? 'API key invalid' : 'API key not configured')}
    >
      <span class="provider-dot" class:ok={$modtaleStatus.valid} class:error={$modtaleStatus.configured && !$modtaleStatus.valid}></span>
      Modtale
    </button>
    <button
      class="provider-btn"
      class:active={$currentProvider === 'curseforge'}
      class:unavailable={!$curseforgeStatus.configured || !$curseforgeStatus.valid}
      onclick={() => switchProvider('curseforge')}
      title={$curseforgeStatus.valid ? 'CurseForge API ready' : ($curseforgeStatus.configured ? 'API key invalid' : 'API key not configured')}
    >
      <span class="provider-dot" class:ok={$curseforgeStatus.valid} class:error={$curseforgeStatus.configured && !$curseforgeStatus.valid}></span>
      CurseForge
    </button>
  </div>
{/if}

{#if $currentView === 'browse'}
  <div class="mods-search">
    <input
      type="text"
      class="mods-search-input"
      placeholder={$_('searchForMods')}
      bind:value={searchQuery}
      onkeypress={(e: KeyboardEvent) => e.key === 'Enter' && searchMods()}
    />
    {#if $currentProvider === 'modtale'}
      <select class="mods-filter-select" bind:value={classificationFilter} onchange={() => searchMods()}>
        <option value="">{$_('allTypes')}</option>
        <option value="PLUGIN">{$_('typePlugin')}</option>
        <option value="DATA">{$_('typeData')}</option>
        <option value="ART">{$_('typeArt')}</option>
        <option value="SAVE">{$_('typeSave')}</option>
        <option value="MODPACK">{$_('typeModpack')}</option>
      </select>
    {/if}
    <button class="mc-btn small" onclick={() => searchMods()}>{$_('search')}</button>
  </div>
{/if}

{#if $currentView === 'installed'}
  <div class="mods-list">
    {#if $isModsLoading}
      <div class="mods-empty mods-loader">{$_('loading')}</div>
    {:else if $installedMods.length === 0}
      <div class="mods-empty">{$_('noModsInstalled')}</div>
    {:else}
      {#each $installedMods as mod}
        {@const updateInfo = getUpdateInfo(mod.id)}
        {@const modUrl = getModUrl(mod)}
        <div class="mod-card" class:has-update={updateInfo}>
          <div class="mod-icon">
            {#if mod.projectIconUrl}
              <img src={mod.projectIconUrl} alt="" onerror={(e: Event) => (e.target as HTMLImageElement).style.display='none'} />
            {:else}
              ?
            {/if}
          </div>
          <div class="mod-info">
            <div class="mod-title">
              {#if modUrl}
                <a href={modUrl} target="_blank" class="mod-link">{mod.projectTitle}</a>
              {:else}
                {mod.projectTitle}
              {/if}
              <span class="mod-classification {mod.classification}">{mod.classification}</span>
              {#if mod.providerId === 'curseforge'}
                <span class="mod-provider-badge cf">CF</span>
              {/if}
              {#if updateInfo}
                <span class="mod-update-badge">{$_('updateAvailable')}</span>
              {/if}
            </div>
            <div class="mod-meta">
              <span>v{mod.versionName}</span>
              {#if updateInfo}
                <span class="update-version">→ v{updateInfo.latestVersion}</span>
              {/if}
              <span style="color: var(--{mod.enabled ? 'success' : 'error'})">{mod.enabled ? 'Enabled' : 'Disabled'}</span>
              {#if mod.isLocal}
                <span class="mod-local-badge">Local</span>
              {/if}
            </div>
          </div>
          <div class="mod-actions">
            {#if updateInfo}
              <button class="mod-btn update" onclick={() => updateMod(mod, updateInfo)}>{$_('update')}</button>
            {/if}
            <div class="mod-toggle" class:enabled={mod.enabled} role="button" tabindex="0" onclick={() => toggleMod(mod)} onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && toggleMod(mod)} title={mod.enabled ? $_('disable') : $_('enable')}></div>
            <button class="mod-btn danger" onclick={() => uninstallMod(mod.id)}>{$_('remove')}</button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
{:else}
  <div class="mods-list">
    {#if $isModsLoading}
      <div class="mods-empty mods-loader">{$_('loading')}</div>
    {:else if $searchResults.length === 0}
      <div class="mods-empty">{$_('noModsFound')}</div>
    {:else}
      {#each $searchResults as mod}
        {@const alreadyInstalled = isModInstalled(mod.id)}
        {@const latestVersion = mod.latestVersion || mod.versions?.[0]}
        {@const modUrl = getModUrl(mod)}
        {@const noDistribution = 'allowDistribution' in mod && mod.allowDistribution === false}
        <div class="mod-card" class:no-distribution={noDistribution}>
          <div class="mod-icon">
            {#if mod.iconUrl}
              <img src={mod.iconUrl} alt="" onerror={(e: Event) => (e.target as HTMLImageElement).style.display='none'} />
            {:else}
              ?
            {/if}
          </div>
          <div class="mod-info">
            <div class="mod-title">
              {#if modUrl}
                <a href={modUrl} target="_blank" class="mod-link">{mod.title}</a>
              {:else}
                {mod.title}
              {/if}
              <span class="mod-classification {mod.classification}">{mod.classification}</span>
              {#if noDistribution}
                <span class="mod-no-dist-badge" title={$_('modNoDistribution')}>⚠</span>
              {/if}
            </div>
            <div class="mod-meta">
              <span>{mod.author}</span>
              {#if mod.downloads}
                <span>{formatNumber(mod.downloads)} downloads</span>
              {/if}
              {#if latestVersion?.version}
                <span>v{latestVersion.version}</span>
              {/if}
            </div>
            {#if mod.shortDescription}
              <div class="mod-description">{mod.shortDescription}</div>
            {/if}
          </div>
          <div class="mod-actions">
            <button class="mod-btn install" onclick={() => installMod(mod)} disabled={alreadyInstalled || noDistribution}>
              {#if noDistribution}
                {$_('manualOnly')}
              {:else if alreadyInstalled}
                {$_('installed')}
              {:else}
                {$_('install')}
              {/if}
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  {#if $searchResults.length > 0}
    <div class="mods-pagination">
      <button class="mc-btn small" onclick={() => changePage(-1)} disabled={$currentPage <= 1}>
        &lt; {$_('prev')}
      </button>
      <span class="mods-page-info">{$_('page')} {$currentPage}</span>
      <button class="mc-btn small" onclick={() => changePage(1)} disabled={!$hasMore}>
        {$_('next')} &gt;
      </button>
    </div>
  {/if}
{/if}
