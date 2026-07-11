import type { UploadFileItem } from '$lib/services/api';

export function toUploadItems(files: Iterable<File>): UploadFileItem[] {
  return Array.from(files).map((file) => ({
    file,
    relativePath: file.webkitRelativePath || file.name
  }));
}

interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

interface FileSystemFileEntryLike extends FileSystemEntryLike {
  file: (success: (file: File) => void, error?: (err: DOMException) => void) => void;
}

interface FileSystemDirectoryReaderLike {
  readEntries: (success: (entries: FileSystemEntryLike[]) => void, error?: (err: DOMException) => void) => void;
}

interface FileSystemDirectoryEntryLike extends FileSystemEntryLike {
  createReader: () => FileSystemDirectoryReaderLike;
}

interface DataTransferItemWithEntry {
  webkitGetAsEntry?: () => FileSystemEntryLike | null;
}

async function entryToUploadItems(entry: FileSystemEntryLike, parentPath = ''): Promise<UploadFileItem[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntryLike;
    const file = await new Promise<File>((resolve, reject) => {
      fileEntry.file(resolve, reject);
    });
    return [{ file, relativePath: parentPath ? `${parentPath}/${file.name}` : file.name }];
  }

  if (!entry.isDirectory) return [];

  const dirEntry = entry as FileSystemDirectoryEntryLike;
  const reader = dirEntry.createReader();
  const entries = await new Promise<FileSystemEntryLike[]>((resolve, reject) => {
    const collected: FileSystemEntryLike[] = [];
    const readAll = (): void => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(collected);
          return;
        }
        collected.push(...batch);
        readAll();
      }, reject);
    };
    readAll();
  });

  const nextPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
  const nested = await Promise.all(entries.map((child) => entryToUploadItems(child, nextPath)));
  return nested.flat();
}

export async function collectDroppedItems(dataTransfer: DataTransfer): Promise<UploadFileItem[]> {
  const itemEntries = Array.from(dataTransfer.items || []);
  const hasEntryApi = itemEntries.some((item) => {
    const withEntry = item as unknown as DataTransferItemWithEntry;
    return typeof withEntry.webkitGetAsEntry === 'function';
  });

  if (!hasEntryApi) {
    return toUploadItems(dataTransfer.files);
  }

  const all: UploadFileItem[] = [];
  for (const item of itemEntries) {
    const withEntry = item as unknown as DataTransferItemWithEntry;
    const entry = withEntry.webkitGetAsEntry?.();
    if (!entry) continue;

    try {
      const items = await entryToUploadItems(entry);
      all.push(...items);
    } catch {
      // Some OS-protected files may throw AccessDenied; skip and continue.
    }
  }

  return all;
}
