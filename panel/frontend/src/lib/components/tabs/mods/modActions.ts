import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { emit } from '$lib/services/socketClient';
import {
  apiConfigured,
  cfApiConfigured,
  classificationFilter,
  currentPage,
  currentProvider,
  currentView,
  curseforgeStatus,
  hasMore,
  isModsLoading,
  type ModProvider,
  type ModView,
  modtaleStatus,
  searchQuery,
  searchResults
} from '$lib/stores/mods';
import { showToast } from '$lib/stores/ui';
import type { InstalledMod, ModProject, ModUpdate } from '$lib/types';

let initialBrowseLoad = true;

export function isCurrentApiConfigured(): boolean {
  const provider = get(currentProvider);
  return provider === 'modtale' ? get(apiConfigured) : get(cfApiConfigured);
}

export function getApiErrorMessage(): string {
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

export function loadInstalledMods(): void {
  isModsLoading.set(true);
  emit('mods:list');
}

export function switchView(view: ModView): void {
  currentView.set(view);
  if (view === 'installed') {
    loadInstalledMods();
  } else if (get(searchResults).length === 0 || initialBrowseLoad) {
    searchMods();
  }
}

export function switchProvider(provider: ModProvider): void {
  currentProvider.set(provider);
  searchResults.set([]);
  currentPage.set(1);
  hasMore.set(false);
  initialBrowseLoad = true;
  if (get(currentView) === 'browse') {
    searchMods();
  }
}

export function searchMods(page = 1): void {
  if (!isCurrentApiConfigured()) {
    showToast(getApiErrorMessage(), 'error');
    return;
  }
  isModsLoading.set(true);
  initialBrowseLoad = false;

  const provider = get(currentProvider);
  if (provider === 'curseforge') {
    emit('cf:search', {
      query: get(searchQuery),
      page,
      pageSize: 20
    });
  } else {
    emit('mods:search', {
      query: get(searchQuery),
      classification: get(classificationFilter) || undefined,
      page,
      pageSize: 20
    });
  }
}

export function changePage(delta: number): void {
  const newPage = get(currentPage) + delta;
  if (newPage < 1) return;
  if (delta > 0 && !get(hasMore)) return;
  searchMods(newPage);
}

export function installMod(mod: ModProject): void {
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

  const metadata = {
    projectTitle: mod.title,
    projectSlug: mod.slug,
    projectIconUrl: mod.iconUrl,
    versionName: latestVersion.version,
    classification: mod.classification,
    fileName: latestVersion.fileName
  };

  if (provider === 'curseforge') {
    // Check if mod allows distribution
    if ('allowDistribution' in mod && mod.allowDistribution === false) {
      showToast(get(_)('modNoDistribution'), 'error');
      return;
    }
    emit('cf:install', { modId: mod.id, fileId: latestVersion.id, metadata });
  } else {
    emit('mods:install', { projectId: mod.id, versionId: latestVersion.id, metadata });
  }
}

export function toggleMod(mod: InstalledMod): void {
  if (mod.enabled) {
    emit('mods:disable', mod.id);
  } else {
    emit('mods:enable', mod.id);
  }
}

export function updateMod(mod: InstalledMod, updateInfo: ModUpdate): void {
  emit('mods:update', {
    modId: mod.id,
    versionId: updateInfo.latestVersionId,
    metadata: {
      versionName: updateInfo.latestVersion,
      fileName: updateInfo.latestFileName
    }
  });
}

export function getModUrl(mod: InstalledMod | ModProject): string | null {
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

export function classificationClass(classification: string | undefined): string {
  switch (classification) {
    case 'PLUGIN':
      return 'bg-info/15 border-info/40 text-info';
    case 'DATA':
      return 'bg-success/15 border-success/40 text-grass-light';
    case 'ART':
      return 'bg-warning/15 border-warning/40 text-warning';
    default:
      return 'bg-panel-light border-panel-border-light text-text-muted';
  }
}
