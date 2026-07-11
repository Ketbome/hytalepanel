import type { UncheckedMod } from '$lib/types';

export type Translate = (key: string, options?: { values?: Record<string, string | number> }) => string;

export function getUncheckedModReasonLabel(t: Translate, reason: UncheckedMod['reason']): string {
  switch (reason) {
    case 'local_mod':
      return t('uncheckedReasonLocalMod');
    case 'missing_project_id':
      return t('uncheckedReasonMissingProjectId');
    case 'modtale_api_not_configured':
      return t('uncheckedReasonModtaleApi');
    case 'curseforge_api_not_configured':
      return t('uncheckedReasonCurseforgeApi');
    case 'unknown_provider':
      return t('uncheckedReasonUnknownProvider');
    case 'provider_lookup_failed':
      return t('uncheckedReasonLookupFailed');
  }
}

export function formatUncheckedModsMessage(t: Translate, uncheckedMods: UncheckedMod[]): string {
  const details = uncheckedMods
    .map((mod) => `${mod.projectTitle}: ${getUncheckedModReasonLabel(t, mod.reason)}`)
    .join('; ');
  return t('noUpdatesUncheckedDetails', {
    values: {
      count: uncheckedMods.length,
      details
    }
  });
}
