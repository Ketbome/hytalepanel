import { describe, expect, test } from '@jest/globals';
import { isUpdateNeeded } from '../src/socket/handlers.js';
import type { InstalledMod } from '../src/services/mods.js';

function makeMod(overrides: Partial<InstalledMod> = {}): InstalledMod {
  return {
    id: 'mod-1',
    providerId: 'curseforge',
    projectId: '123',
    projectSlug: 'portal-world',
    projectTitle: 'Portal World',
    projectIconUrl: null,
    versionId: '9000',
    versionName: 'v1.5.3.jar',
    classification: 'PLUGIN',
    fileName: 'v1.5.3.jar',
    fileSize: 1024,
    enabled: true,
    installedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('isUpdateNeeded', () => {
  test('returns false when latest id matches installed version id', () => {
    const mod = makeMod({ versionId: 'abc-1' });
    const latest = { id: 'abc-1', version: '1.5.4', fileName: 'vPortalWorld-1.5.4.jar' };

    expect(isUpdateNeeded(mod, latest)).toBe(false);
  });

  test('returns false when version strings match', () => {
    const mod = makeMod({ versionId: null, versionName: 'v1.5.3.jar', fileName: 'v1.5.3.jar' });
    const latest = { id: 'cf-file-2', version: 'Portal World 1.5.3', fileName: 'vPortalWorld-1.5.3.jar' };

    expect(isUpdateNeeded(mod, latest)).toBe(false);
  });

  test('returns false when normalized file names match despite prefix differences', () => {
    const mod = makeMod({ versionId: null, versionName: 'Unknown', fileName: 'PortalWorld-1.5.3.jar' });
    const latest = { id: 'cf-file-3', version: 'latest', fileName: 'vPortalWorld-1.5.3.jar' };

    expect(isUpdateNeeded(mod, latest)).toBe(false);
  });

  test('returns true when latest file id exists and versions differ', () => {
    const mod = makeMod({ versionId: null, versionName: 'v1.5.2.jar', fileName: 'v1.5.2.jar' });
    const latest = { id: 'cf-file-4', version: '1.5.3', fileName: 'vPortalWorld-1.5.3.jar' };

    expect(isUpdateNeeded(mod, latest)).toBe(true);
  });
});
