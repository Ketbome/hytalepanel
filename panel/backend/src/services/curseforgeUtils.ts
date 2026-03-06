export interface CurseForgeFileLike {
  id: number;
  releaseType: number; // 1=Release, 2=Beta, 3=Alpha
  fileDate: string;
  isAvailable: boolean;
}

const RELEASE_PRIORITY: number[] = [1, 2, 3];

function getReleaseRank(releaseType: number): number {
  const index = RELEASE_PRIORITY.indexOf(releaseType);
  return index >= 0 ? index : RELEASE_PRIORITY.length;
}

function getFileTimestamp(fileDate: string): number {
  const parsed = Date.parse(fileDate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function getAvailableFilesSorted<T extends CurseForgeFileLike>(files: T[]): T[] {
  return files
    .filter((file) => file.isAvailable)
    .sort((a, b) => getFileTimestamp(b.fileDate) - getFileTimestamp(a.fileDate));
}

export function pickLatestByStability<T extends CurseForgeFileLike>(files: T[]): T | null {
  const availableFiles = getAvailableFilesSorted(files);
  if (availableFiles.length === 0) return null;

  for (const releaseType of RELEASE_PRIORITY) {
    const matchingFiles = availableFiles.filter((file) => file.releaseType === releaseType);
    if (matchingFiles.length > 0) {
      return matchingFiles[0];
    }
  }

  return availableFiles.sort((a, b) => getReleaseRank(a.releaseType) - getReleaseRank(b.releaseType))[0];
}
