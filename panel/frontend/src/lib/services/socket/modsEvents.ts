import type { Socket } from 'socket.io-client';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import {
  apiConfigured,
  availableUpdates,
  cfApiConfigured,
  currentPage,
  curseforgeStatus,
  hasMore,
  installedError,
  installedMods,
  isModsLoading,
  modtaleStatus,
  searchError,
  searchResults,
  total
} from '$lib/stores/mods';
import { showToast } from '$lib/stores/ui';
import type { InstalledMod, ModOperationResult, ModProject, ModSearchResult, ModUpdatesResult } from '$lib/types';
import { formatUncheckedModsMessage } from '$lib/utils/modMessages';

type ConfigStatus = { configured: boolean; valid: boolean; error?: string };
type ProjectResult = { success: boolean; project?: ModProject; error?: string };

function handleSearchResult(result: ModSearchResult): void {
  isModsLoading.set(false);
  if (result.success) {
    searchError.set(null);
    searchResults.set(result.projects || []);
    total.set(result.total || 0);
    hasMore.set(result.hasMore || false);
    currentPage.set(result.page || 1);
  } else {
    // Shown inside the browse list
    searchError.set(result.error || get(_)('error'));
    searchResults.set([]);
  }
}

// On get-result, refresh search results with full details and auto-install the latest version
function makeGetHandler(socket: Socket, installEvent: string, idKey: 'projectId' | 'modId') {
  return (result: ProjectResult): void => {
    if (result.success && result.project) {
      const project = result.project;
      searchResults.update((results) => {
        const index = results.findIndex((m) => m.id === project.id);
        if (index >= 0) {
          results[index] = project;
        }
        return results;
      });
      const latestVersion = project.latestVersion || project.versions?.[0];
      if (latestVersion?.id) {
        socket.emit(installEvent, {
          [idKey]: project.id,
          [idKey === 'projectId' ? 'versionId' : 'fileId']: latestVersion.id,
          metadata: {
            projectTitle: project.title,
            projectSlug: project.slug,
            projectIconUrl: project.iconUrl,
            versionName: latestVersion.version,
            classification: project.classification,
            fileName: latestVersion.fileName
          }
        });
      }
    } else if (result.error) {
      showToast(`${get(_)('error')}: ${result.error}`, 'error');
    }
  };
}

export function registerModsEvents(socket: Socket): void {
  // Invalid keys are shown in the Mods tab (provider status and browse notice), not as toasts
  socket.on('mods:config-status', (result: ConfigStatus) => {
    modtaleStatus.set(result);
    apiConfigured.set(result.configured && result.valid);
  });

  socket.on('cf:config-status', (result: ConfigStatus) => {
    curseforgeStatus.set(result);
    cfApiConfigured.set(result.configured && result.valid);
  });

  socket.on('mods:list-result', (result: { success: boolean; mods?: InstalledMod[]; error?: string }) => {
    isModsLoading.set(false);
    if (result.success && result.mods) {
      installedError.set(null);
      installedMods.set(result.mods);
    } else {
      installedError.set(result.error || get(_)('error'));
    }
  });

  socket.on('mods:search-result', handleSearchResult);
  socket.on('cf:search-result', handleSearchResult);

  socket.on('mods:get-result', makeGetHandler(socket, 'mods:install', 'projectId'));
  socket.on('cf:get-result', makeGetHandler(socket, 'cf:install', 'modId'));

  // Simple operation results: toast + refresh installed list. Enable/disable show in the switch, so no toast
  const ops: Array<[string, string | null, string]> = [
    ['mods:install-result', 'modInstalled', 'installFailed'],
    ['cf:install-result', 'modInstalled', 'installFailed'],
    ['mods:uninstall-result', 'modUninstalled', 'error'],
    ['mods:enable-result', null, 'error'],
    ['mods:disable-result', null, 'error']
  ];

  for (const [event, okKey, failKey] of ops) {
    socket.on(event, (result: ModOperationResult) => {
      const t = get(_);
      if (result.success) {
        if (okKey) showToast(t(okKey));
        socket.emit('mods:list');
      } else {
        showToast(`${t(failKey)}: ${result.error}`, 'error');
      }
    });
  }

  socket.on('mods:check-updates-result', (result: ModUpdatesResult) => {
    const t = get(_);
    if (result.success) {
      availableUpdates.set(result.updates || []);
      if (result.updates && result.updates.length > 0) {
        showToast(t('updatesAvailable', { values: { count: result.updates.length } }));
      } else if ((result.uncheckedMods || 0) > 0) {
        showToast(formatUncheckedModsMessage(t, result.uncheckedModDetails || []), 'warning');
      } else {
        showToast(t('noUpdates'));
      }
    } else {
      showToast(`${t('error')}: ${result.error}`, 'error');
    }
  });

  socket.on('mods:update-result', (result: ModOperationResult) => {
    const t = get(_);
    if (result.success) {
      showToast(t('modUpdated'));
      socket.emit('mods:list');
      socket.emit('mods:check-updates');
    } else {
      showToast(`${t('updateFailed')}: ${result.error}`, 'error');
    }
  });
}
