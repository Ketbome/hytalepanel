<script lang="ts">
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import Skeleton from '$lib/components/ui/Skeleton.svelte';
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
    return get(_)('apiKeyNotConfigured', {
      values: { provider: providerName }
    });
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

<div class="space-y-3">
  <!-- View Toggle & API Status -->
  <div class="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-panel-light border-4 border-panel-border">
    <!-- API Status -->
    <div class="flex items-center gap-2">
      <span 
        class="px-2 py-1 font-mono text-xs border-2 transition-all cursor-default
               {$modtaleStatus.valid 
                 ? 'bg-grass/30 border-grass text-grass-light' 
                 : $modtaleStatus.configured 
                   ? 'bg-error/30 border-error text-error' 
                   : 'bg-panel-bg border-panel-border text-text-dim'}"
        title={$modtaleStatus.valid ? 'Modtale: OK' : $modtaleStatus.configured ? `Modtale: ${$modtaleStatus.error || 'Invalid'}` : 'Modtale: Not configured'}
      >
        M
      </span>
      <span 
        class="px-2 py-1 font-mono text-xs border-2 transition-all cursor-default
               {$curseforgeStatus.valid 
                 ? 'bg-grass/30 border-grass text-grass-light' 
                 : $curseforgeStatus.configured 
                   ? 'bg-error/30 border-error text-error' 
                   : 'bg-panel-bg border-panel-border text-text-dim'}"
        title={$curseforgeStatus.valid ? 'CurseForge: OK' : $curseforgeStatus.configured ? `CurseForge: ${$curseforgeStatus.error || 'Invalid'}` : 'CurseForge: Not configured'}
      >
        CF
      </span>
    </div>
    
    <!-- View Buttons -->
    <div class="flex items-center gap-2">
      <button 
        class="px-3 py-2 font-mono text-sm border-3 transition-all
               {$currentView === 'installed' 
                 ? 'bg-grass border-grass-dark text-panel-bg shadow-mc-btn-pressed' 
                 : 'bg-panel-bg border-panel-border text-text-muted hover:bg-panel-lighter hover:text-text shadow-mc-btn'}"
        onclick={() => switchView('installed')}
      >
        📦 {$_('local')}
      </button>
      <button 
        class="px-3 py-2 font-mono text-sm border-3 transition-all
               {$currentView === 'browse' 
                 ? 'bg-grass border-grass-dark text-panel-bg shadow-mc-btn-pressed' 
                 : 'bg-panel-bg border-panel-border text-text-muted hover:bg-panel-lighter hover:text-text shadow-mc-btn'}"
        onclick={() => switchView('browse')}
      >
        🌐 {$_('browse')}
      </button>
      <button 
        class="px-3 py-2 font-mono text-sm border-3 transition-all
               bg-hytale-gold/20 border-hytale-gold/50 text-hytale-gold
               hover:bg-hytale-gold hover:text-panel-bg
               disabled:opacity-50 disabled:cursor-not-allowed
               shadow-mc-btn active:shadow-mc-btn-pressed"
        onclick={checkForUpdates} 
        disabled={isCheckingUpdates}
      >
        ⟳ {$_('checkUpdates')}
      </button>
    </div>
  </div>

  <!-- Provider Toggle (Browse mode) -->
  {#if $currentView === 'browse'}
    <div class="flex items-center gap-2 px-3 py-2 bg-panel-light border-4 border-panel-border">
      <span class="font-mono text-sm text-text-dim mr-2">Provider:</span>
      <button
        class="flex items-center gap-2 px-4 py-2 font-mono text-sm border-3 transition-all
               {$currentProvider === 'modtale' 
                 ? 'bg-info border-info text-white shadow-mc-btn-pressed' 
                 : 'bg-panel-bg border-panel-border text-text-muted hover:bg-panel-lighter shadow-mc-btn'}
               {(!$modtaleStatus.configured || !$modtaleStatus.valid) ? 'opacity-50' : ''}"
        onclick={() => switchProvider('modtale')}
        title={$modtaleStatus.valid ? 'Modtale API ready' : ($modtaleStatus.configured ? 'API key invalid' : 'API key not configured')}
      >
        <span class="w-2 h-2 rounded-full {$modtaleStatus.valid ? 'bg-grass' : $modtaleStatus.configured ? 'bg-error' : 'bg-stone'}"></span>
        Modtale
      </button>
      <button
        class="flex items-center gap-2 px-4 py-2 font-mono text-sm border-3 transition-all
               {$currentProvider === 'curseforge' 
                 ? 'bg-[#f16436] border-[#c44e2b] text-white shadow-mc-btn-pressed' 
                 : 'bg-panel-bg border-panel-border text-text-muted hover:bg-panel-lighter shadow-mc-btn'}
               {(!$curseforgeStatus.configured || !$curseforgeStatus.valid) ? 'opacity-50' : ''}"
        onclick={() => switchProvider('curseforge')}
        title={$curseforgeStatus.valid ? 'CurseForge API ready' : ($curseforgeStatus.configured ? 'API key invalid' : 'API key not configured')}
      >
        <span class="w-2 h-2 rounded-full {$curseforgeStatus.valid ? 'bg-grass' : $curseforgeStatus.configured ? 'bg-error' : 'bg-stone'}"></span>
        CurseForge
      </button>
    </div>
  {/if}

  <!-- Search Bar (Browse mode) -->
  {#if $currentView === 'browse'}
    <div class="flex flex-wrap items-center gap-2 px-3 py-2 bg-panel-light border-4 border-panel-border">
      <input
        type="text"
        class="flex-1 min-w-[200px] px-4 py-2 font-mono text-sm
               bg-panel-bg border-3 border-panel-border text-text
               placeholder:text-text-dim
               focus:outline-none focus:border-grass/50"
        placeholder={$_('searchForMods')}
        bind:value={searchQuery}
        onkeypress={(e: KeyboardEvent) => e.key === 'Enter' && searchMods()}
      />
      {#if $currentProvider === 'modtale'}
        <select 
          class="px-3 py-2 font-mono text-sm appearance-none cursor-pointer
                 bg-panel-bg border-3 border-panel-border text-text
                 focus:outline-none focus:border-grass/50"
          bind:value={classificationFilter} 
          onchange={() => searchMods()}
        >
          <option value="">{$_('allTypes')}</option>
          <option value="PLUGIN">{$_('typePlugin')}</option>
          <option value="DATA">{$_('typeData')}</option>
          <option value="ART">{$_('typeArt')}</option>
          <option value="SAVE">{$_('typeSave')}</option>
          <option value="MODPACK">{$_('typeModpack')}</option>
        </select>
      {/if}
      <button 
        class="px-4 py-2 font-mono text-sm border-3 transition-all
               bg-grass border-grass-dark text-panel-bg
               hover:bg-grass-light shadow-mc-btn active:shadow-mc-btn-pressed"
        onclick={() => searchMods()}
      >
        🔍 {$_('search')}
      </button>
    </div>
  {/if}

  <!-- Installed Mods -->
  {#if $currentView === 'installed'}
    <div class="space-y-2">
      {#if $isModsLoading}
        {#each Array(3) as _}
          <Skeleton type="card" />
        {/each}
      {:else if $installedMods.length === 0}
        <div class="px-4 py-8 text-center bg-panel-light border-4 border-panel-border">
          <div class="text-3xl mb-2">📭</div>
          <div class="font-mono text-text-dim">{$_('noModsInstalled')}</div>
        </div>
      {:else}
        {#each $installedMods as mod}
          {@const updateInfo = getUpdateInfo(mod.id)}
          {@const modUrl = getModUrl(mod)}
          <div class="flex items-start gap-4 p-4 bg-panel-light border-4 transition-all
                      {updateInfo ? 'border-hytale-gold/70 hover:border-hytale-gold' : 'border-panel-border hover:border-grass/50'}">
            <!-- Icon -->
            <div class="w-14 h-14 shrink-0 bg-panel-bg border-3 border-panel-border flex items-center justify-center overflow-hidden">
              {#if mod.projectIconUrl}
                <img src={mod.projectIconUrl} alt="" class="w-full h-full object-cover" onerror={(e: Event) => (e.target as HTMLImageElement).style.display='none'} />
              {:else}
                <span class="font-mono text-2xl text-text-dim">?</span>
              {/if}
            </div>
            
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                {#if modUrl}
                  <a href={modUrl} target="_blank" class="font-mono text-base text-grass-light hover:text-grass hover:underline">{mod.projectTitle}</a>
                {:else}
                  <span class="font-mono text-base text-text">{mod.projectTitle}</span>
                {/if}
                <span class="px-1.5 py-0.5 text-xs font-mono border 
                            {mod.classification === 'PLUGIN' ? 'bg-info/20 border-info/50 text-info' : 
                             mod.classification === 'DATA' ? 'bg-grass/20 border-grass/50 text-grass-light' :
                             mod.classification === 'ART' ? 'bg-warning/20 border-warning/50 text-warning' :
                             'bg-stone/30 border-stone text-text-muted'}">{mod.classification}</span>
                {#if mod.providerId === 'curseforge'}
                  <span class="px-1.5 py-0.5 text-xs font-mono bg-[#f16436]/20 border border-[#f16436]/50 text-[#f16436]">CF</span>
                {/if}
                {#if updateInfo}
                  <span class="px-1.5 py-0.5 text-xs font-mono bg-hytale-gold/30 border border-hytale-gold text-hytale-gold animate-pulse">{$_('updateAvailable')}</span>
                {/if}
              </div>
              <div class="flex flex-wrap items-center gap-3 font-mono text-sm text-text-muted">
                <span>v{mod.versionName}</span>
                {#if updateInfo}
                  <span class="text-hytale-gold">→ v{updateInfo.latestVersion}</span>
                {/if}
                <span class:text-grass-light={mod.enabled} class:text-error={!mod.enabled}>
                  {mod.enabled ? '● Enabled' : '○ Disabled'}
                </span>
                {#if mod.isLocal}
                  <span class="px-1.5 py-0.5 text-xs bg-panel-bg border border-panel-border">Local</span>
                {/if}
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center gap-2 shrink-0">
              {#if updateInfo}
                <button 
                  class="px-3 py-2 font-mono text-xs border-3 transition-all
                         bg-hytale-gold border-hytale-orange text-panel-bg
                         hover:bg-hytale-orange shadow-mc-btn active:shadow-mc-btn-pressed"
                  onclick={() => updateMod(mod, updateInfo)}
                >
                  ⬆ {$_('update')}
                </button>
              {/if}
              <button 
                class="w-12 h-8 border-3 transition-all relative
                       {mod.enabled 
                         ? 'bg-grass border-grass-dark' 
                         : 'bg-stone-dark border-stone'}"
                role="switch"
                aria-checked={mod.enabled}
                onclick={() => toggleMod(mod)}
                title={mod.enabled ? $_('disable') : $_('enable')}
              >
                <span class="absolute top-1 w-5 h-5 bg-text transition-all
                            {mod.enabled ? 'right-1' : 'left-1'}"></span>
              </button>
              <button 
                class="px-3 py-2 font-mono text-xs border-3 transition-all
                       bg-error/30 border-error/70 text-error
                       hover:bg-error hover:text-white shadow-mc-btn active:shadow-mc-btn-pressed"
                onclick={() => uninstallMod(mod.id)}
              >
                ✕
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {:else}
    <!-- Browse Mods -->
    <div class="space-y-2">
      {#if $isModsLoading}
        {#each Array(4) as _}
          <Skeleton type="card" />
        {/each}
      {:else if $searchResults.length === 0}
        <div class="px-4 py-8 text-center bg-panel-light border-4 border-panel-border">
          <div class="text-3xl mb-2">🔍</div>
          <div class="font-mono text-text-dim">{$_('noModsFound')}</div>
        </div>
      {:else}
        {#each $searchResults as mod}
          {@const alreadyInstalled = isModInstalled(mod.id)}
          {@const latestVersion = mod.latestVersion || mod.versions?.[0]}
          {@const modUrl = getModUrl(mod)}
          {@const noDistribution = 'allowDistribution' in mod && mod.allowDistribution === false}
          <div class="flex items-start gap-4 p-4 bg-panel-light border-4 border-panel-border transition-all
                      {noDistribution ? 'opacity-60' : 'hover:border-grass/50'}">
            <!-- Icon -->
            <div class="w-14 h-14 shrink-0 bg-panel-bg border-3 border-panel-border flex items-center justify-center overflow-hidden">
              {#if mod.iconUrl}
                <img src={mod.iconUrl} alt="" class="w-full h-full object-cover" onerror={(e: Event) => (e.target as HTMLImageElement).style.display='none'} />
              {:else}
                <span class="font-mono text-2xl text-text-dim">?</span>
              {/if}
            </div>
            
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                {#if modUrl}
                  <a href={modUrl} target="_blank" class="font-mono text-base text-grass-light hover:text-grass hover:underline">{mod.title}</a>
                {:else}
                  <span class="font-mono text-base text-text">{mod.title}</span>
                {/if}
                <span class="px-1.5 py-0.5 text-xs font-mono border 
                            {mod.classification === 'PLUGIN' ? 'bg-info/20 border-info/50 text-info' : 
                             mod.classification === 'DATA' ? 'bg-grass/20 border-grass/50 text-grass-light' :
                             mod.classification === 'ART' ? 'bg-warning/20 border-warning/50 text-warning' :
                             'bg-stone/30 border-stone text-text-muted'}">{mod.classification}</span>
                {#if noDistribution}
                  <span class="px-1.5 py-0.5 text-xs font-mono bg-warning/30 border border-warning text-warning" title={$_('modNoDistribution')}>⚠</span>
                {/if}
              </div>
              <div class="flex flex-wrap items-center gap-3 font-mono text-sm text-text-muted mb-2">
                <span>{mod.author}</span>
                {#if mod.downloads}
                  <span>📥 {formatNumber(mod.downloads)}</span>
                {/if}
                {#if latestVersion?.version}
                  <span>v{latestVersion.version}</span>
                {/if}
              </div>
              {#if mod.shortDescription}
                <div class="font-mono text-sm text-text-dim line-clamp-2">{mod.shortDescription}</div>
              {/if}
            </div>
            
            <!-- Actions -->
            <div class="shrink-0">
              <button 
                class="px-4 py-2 font-mono text-sm border-3 transition-all
                       {alreadyInstalled 
                         ? 'bg-stone-dark border-stone text-text-dim cursor-not-allowed' 
                         : noDistribution 
                           ? 'bg-warning/20 border-warning text-warning cursor-not-allowed'
                           : 'bg-grass border-grass-dark text-panel-bg hover:bg-grass-light shadow-mc-btn active:shadow-mc-btn-pressed'}"
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
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Pagination -->
    {#if $searchResults.length > 0}
      <div class="flex items-center justify-center gap-4 px-4 py-3 bg-panel-light border-4 border-panel-border">
        <button 
          class="px-4 py-2 font-mono text-sm border-3 transition-all
                 bg-panel-bg border-panel-border text-text-muted
                 hover:bg-panel-lighter hover:text-text
                 disabled:opacity-50 disabled:cursor-not-allowed
                 shadow-mc-btn active:shadow-mc-btn-pressed"
          onclick={() => changePage(-1)} 
          disabled={$currentPage <= 1}
        >
          ◀ {$_('prev')}
        </button>
        <span class="font-mono text-text-muted">{$_('page')} {$currentPage}</span>
        <button 
          class="px-4 py-2 font-mono text-sm border-3 transition-all
                 bg-panel-bg border-panel-border text-text-muted
                 hover:bg-panel-lighter hover:text-text
                 disabled:opacity-50 disabled:cursor-not-allowed
                 shadow-mc-btn active:shadow-mc-btn-pressed"
          onclick={() => changePage(1)} 
          disabled={!$hasMore}
        >
          {$_('next')} ▶
        </button>
      </div>
    {/if}
  {/if}
</div>
