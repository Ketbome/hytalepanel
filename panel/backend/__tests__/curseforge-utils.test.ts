import { describe, expect, test } from '@jest/globals';
import { getAvailableFilesSorted, pickLatestByStability, type CurseForgeFileLike } from '../src/services/curseforgeUtils.js';

function file(id: number, releaseType: number, fileDate: string, isAvailable = true): CurseForgeFileLike {
  return { id, releaseType, fileDate, isAvailable };
}

describe('CurseForge file selection policy', () => {
  test('prioritizes Release over newer Beta', () => {
    const files = [file(1, 2, '2026-03-01T00:00:00Z'), file(2, 1, '2026-02-15T00:00:00Z')];
    const latest = pickLatestByStability(files);
    expect(latest?.id).toBe(2);
  });

  test('falls back to Beta when no Release exists', () => {
    const files = [file(1, 3, '2026-03-01T00:00:00Z'), file(2, 2, '2026-02-15T00:00:00Z')];
    const latest = pickLatestByStability(files);
    expect(latest?.id).toBe(2);
  });

  test('falls back to Alpha when only Alpha exists', () => {
    const files = [file(1, 3, '2026-01-01T00:00:00Z'), file(2, 3, '2026-03-01T00:00:00Z')];
    const latest = pickLatestByStability(files);
    expect(latest?.id).toBe(2);
  });

  test('filters unavailable files when sorting', () => {
    const files = [
      file(1, 1, '2026-01-01T00:00:00Z', false),
      file(2, 1, '2026-02-01T00:00:00Z', true),
      file(3, 1, '2026-03-01T00:00:00Z', true)
    ];
    const sorted = getAvailableFilesSorted(files);
    expect(sorted.map((f) => f.id)).toEqual([3, 2]);
  });
});
