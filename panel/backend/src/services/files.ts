import fs from 'node:fs/promises';
import path from 'node:path';
import tar from 'tar-stream';
import config from '../config/index.js';
import * as docker from './docker.js';
import { getServerDataPath } from './servers.js';

const { basePath, editableExtensions, uploadAllowedExtensions } = config.files;

export type FileIcon =
  | 'folder'
  | 'java'
  | 'archive'
  | 'json'
  | 'yaml'
  | 'config'
  | 'text'
  | 'log'
  | 'image'
  | 'script'
  | 'data'
  | 'audio'
  | 'file';

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number | null;
  permissions: string;
  icon: FileIcon;
  editable: boolean;
}

export interface ListResult {
  success: boolean;
  files: FileEntry[];
  path: string;
  error?: string;
}

export interface OperationResult {
  success: boolean;
  error?: string;
}

export interface BackupResult extends OperationResult {
  backupPath?: string;
}

export interface ReadResult extends OperationResult {
  content?: string;
  path?: string;
  binary?: boolean;
}

export interface DownloadResult extends OperationResult {
  stream?: NodeJS.ReadableStream;
  fileName?: string;
}

export interface ServerFilesStatus {
  hasJar: boolean;
  hasAssets: boolean;
  ready: boolean;
}

export function sanitizePath(requestedPath: string): string {
  if (requestedPath.includes('..')) {
    throw new Error('Path traversal attempt detected');
  }
  const normalized = path.normalize(requestedPath);
  const fullPath = path.join(basePath, normalized);
  if (!fullPath.startsWith(basePath)) {
    throw new Error('Path traversal attempt detected');
  }
  return fullPath;
}

export function getRelativePath(fullPath: string): string {
  return fullPath.replace(basePath, '') || '/';
}

export function isAllowedUpload(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return uploadAllowedExtensions.includes(ext);
}

export function isEditable(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return editableExtensions.includes(ext);
}

export function getFileIcon(filename: string, isDirectory: boolean): FileIcon {
  if (isDirectory) return 'folder';
  const ext = path.extname(filename).toLowerCase();
  const icons: Record<string, FileIcon> = {
    '.jar': 'java',
    '.zip': 'archive',
    '.tar': 'archive',
    '.gz': 'archive',
    '.7z': 'archive',
    '.rar': 'archive',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.properties': 'config',
    '.cfg': 'config',
    '.conf': 'config',
    '.xml': 'config',
    '.toml': 'config',
    '.ini': 'config',
    '.txt': 'text',
    '.md': 'text',
    '.log': 'log',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.gif': 'image',
    '.webp': 'image',
    '.lua': 'script',
    '.js': 'script',
    '.sh': 'script',
    '.bat': 'script',
    '.dat': 'data',
    '.nbt': 'data',
    '.mca': 'data',
    '.mcr': 'data',
    '.db': 'data',
    '.ldb': 'data',
    '.ogg': 'audio',
    '.mp3': 'audio',
    '.wav': 'audio'
  };
  return icons[ext] || 'file';
}

export async function listDirectory(dirPath: string, containerName?: string): Promise<ListResult> {
  try {
    const safePath = sanitizePath(dirPath);
    const result = await docker.execCommand(`ls -la "${safePath}" 2>/dev/null | tail -n +2`, 10000, containerName);

    const files: FileEntry[] = [];
    const lines = result
      .trim()
      .split('\n')
      .filter((l) => l.trim());

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 9) {
        const permissions = parts[0];
        const size = Number.parseInt(parts[4], 10);
        const name = parts.slice(8).join(' ');

        if (name === '.' || name === '..') continue;

        const isDir = permissions.startsWith('d');
        files.push({
          name,
          isDirectory: isDir,
          size: isDir ? null : size,
          permissions,
          icon: getFileIcon(name, isDir),
          editable: !isDir && isEditable(name)
        });
      }
    }

    files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, files, path: dirPath };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      files: [],
      path: dirPath
    };
  }
}

export async function createDirectory(dirPath: string, containerName?: string): Promise<OperationResult> {
  try {
    const safePath = sanitizePath(dirPath);
    await docker.execCommand(`mkdir -p "${safePath}"`, 5000, containerName);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteItem(itemPath: string, containerName?: string): Promise<OperationResult> {
  try {
    const safePath = sanitizePath(itemPath);
    if (safePath === basePath) {
      throw new Error('Cannot delete root directory');
    }
    await docker.execCommand(`rm -rf "${safePath}"`, 10000, containerName);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function renameItem(oldPath: string, newPath: string, containerName?: string): Promise<OperationResult> {
  try {
    const safeOld = sanitizePath(oldPath);
    const safeNew = sanitizePath(newPath);
    await docker.execCommand(`mv "${safeOld}" "${safeNew}"`, 5000, containerName);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function createBackup(filePath: string, containerName?: string): Promise<BackupResult> {
  try {
    const safePath = sanitizePath(filePath);
    const backupPath = `${safePath}.backup.${Date.now()}`;
    await docker.execCommand(`cp "${safePath}" "${backupPath}"`, 5000, containerName);
    return { success: true, backupPath: getRelativePath(backupPath) };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function readContent(filePath: string, containerName?: string): Promise<ReadResult> {
  try {
    const safePath = sanitizePath(filePath);

    if (!isEditable(safePath)) {
      return { success: false, error: 'File type not editable', binary: true };
    }

    const stream = await docker.getArchive(safePath, containerName);

    return new Promise((resolve, reject) => {
      const extract = tar.extract();
      let content = '';

      extract.on('entry', (_header, entryStream, next) => {
        const chunks: Buffer[] = [];
        entryStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        entryStream.on('end', () => {
          content = Buffer.concat(chunks).toString('utf8');
          next();
        });
        entryStream.resume();
      });

      extract.on('finish', () => {
        resolve({ success: true, content, path: filePath });
      });

      extract.on('error', reject);
      stream.pipe(extract);
    });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function writeContent(
  filePath: string,
  content: string,
  containerName?: string
): Promise<OperationResult> {
  try {
    const safePath = sanitizePath(filePath);
    const pack = tar.pack();
    const fileName = path.basename(safePath);
    const dirPath = path.dirname(safePath);

    pack.entry({ name: fileName }, content);
    pack.finalize();

    await docker.putArchive(pack, { path: dirPath }, containerName);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function upload(
  targetDir: string,
  fileName: string,
  fileBuffer: Buffer,
  containerName?: string
): Promise<OperationResult & { fileName?: string }> {
  try {
    const safeDirPath = sanitizePath(targetDir);

    if (!isAllowedUpload(fileName)) {
      throw new Error(`File type not allowed: ${path.extname(fileName)}`);
    }

    const pack = tar.pack();
    pack.entry({ name: fileName }, fileBuffer);
    pack.finalize();

    await docker.putArchive(pack, { path: safeDirPath }, containerName);
    return { success: true, fileName };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function download(filePath: string, containerName?: string): Promise<DownloadResult> {
  try {
    const safePath = sanitizePath(filePath);
    const stream = await docker.getArchive(safePath, containerName);
    return { success: true, stream, fileName: path.basename(safePath) };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function checkServerFiles(containerName?: string): Promise<ServerFilesStatus> {
  try {
    const result = await docker.execCommand(
      'ls -la /opt/hytale/*.jar /opt/hytale/*.zip 2>/dev/null || echo "NO_FILES"',
      30000,
      containerName
    );
    const hasJar = result.includes('HytaleServer.jar');
    const hasAssets = result.includes('Assets.zip');
    return { hasJar, hasAssets, ready: hasJar && hasAssets };
  } catch {
    return { hasJar: false, hasAssets: false, ready: false };
  }
}

export async function checkAuth(containerName?: string): Promise<boolean> {
  try {
    const result = await docker.execCommand(
      'cat /opt/hytale/.hytale-downloader-credentials.json 2>/dev/null || echo "NO_AUTH"',
      30000,
      containerName
    );
    return !result.includes('NO_AUTH') && result.includes('access_token');
  } catch {
    return false;
  }
}

export async function wipeData(containerName?: string): Promise<OperationResult> {
  try {
    await docker.execCommand(
      'rm -rf /opt/hytale/universe/* /opt/hytale/logs/* /opt/hytale/config/* ' +
        '/opt/hytale/.cache/* /opt/hytale/.download_attempted ' +
        '/opt/hytale/.hytale-downloader-credentials.json 2>/dev/null || true',
      30000,
      containerName
    );
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ==================== LOCAL FILESYSTEM OPERATIONS ====================
// Used when the container is stopped but files are accessible via bind mount

function getLocalPath(serverId: string, requestedPath: string): string {
  const serverDataPath = getServerDataPath(serverId);
  if (requestedPath.includes('..')) {
    throw new Error('Path traversal attempt detected');
  }
  const normalized = path.normalize(requestedPath).replace(/^\/+/, '');
  const fullPath = path.join(serverDataPath, normalized);
  if (!fullPath.startsWith(serverDataPath)) {
    throw new Error('Path traversal attempt detected');
  }
  return fullPath;
}

export async function listDirectoryLocal(dirPath: string, serverId: string): Promise<ListResult> {
  try {
    const localPath = getLocalPath(serverId, dirPath);
    const entries = await fs.readdir(localPath, { withFileTypes: true });

    const files: FileEntry[] = [];

    for (const entry of entries) {
      if (entry.name === '.' || entry.name === '..') continue;

      const fullPath = path.join(localPath, entry.name);
      const isDir = entry.isDirectory();
      let size: number | null = null;
      let permissions = isDir ? 'drwxr-xr-x' : '-rw-r--r--';

      try {
        const stat = await fs.stat(fullPath);
        size = isDir ? null : stat.size;
        const mode = stat.mode;
        const isDirectory = (mode & 0o40000) !== 0;
        permissions = isDirectory ? 'd' : '-';
        permissions += mode & 0o400 ? 'r' : '-';
        permissions += mode & 0o200 ? 'w' : '-';
        permissions += mode & 0o100 ? 'x' : '-';
        permissions += mode & 0o040 ? 'r' : '-';
        permissions += mode & 0o020 ? 'w' : '-';
        permissions += mode & 0o010 ? 'x' : '-';
        permissions += mode & 0o004 ? 'r' : '-';
        permissions += mode & 0o002 ? 'w' : '-';
        permissions += mode & 0o001 ? 'x' : '-';
      } catch {
        // Use defaults if stat fails
      }

      files.push({
        name: entry.name,
        isDirectory: isDir,
        size,
        permissions,
        icon: getFileIcon(entry.name, isDir),
        editable: !isDir && isEditable(entry.name)
      });
    }

    files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, files, path: dirPath };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      files: [],
      path: dirPath
    };
  }
}

export async function createDirectoryLocal(dirPath: string, serverId: string): Promise<OperationResult> {
  try {
    const localPath = getLocalPath(serverId, dirPath);
    await fs.mkdir(localPath, { recursive: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteItemLocal(itemPath: string, serverId: string): Promise<OperationResult> {
  try {
    const localPath = getLocalPath(serverId, itemPath);
    const serverDataPath = getServerDataPath(serverId);
    if (localPath === serverDataPath) {
      throw new Error('Cannot delete root directory');
    }
    await fs.rm(localPath, { recursive: true, force: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function renameItemLocal(oldPath: string, newPath: string, serverId: string): Promise<OperationResult> {
  try {
    const localOld = getLocalPath(serverId, oldPath);
    const localNew = getLocalPath(serverId, newPath);
    await fs.rename(localOld, localNew);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function createBackupLocal(filePath: string, serverId: string): Promise<BackupResult> {
  try {
    const localPath = getLocalPath(serverId, filePath);
    const backupPath = `${localPath}.backup.${Date.now()}`;
    await fs.copyFile(localPath, backupPath);
    const serverDataPath = getServerDataPath(serverId);
    return {
      success: true,
      backupPath: backupPath.replace(serverDataPath, '') || '/'
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function readContentLocal(filePath: string, serverId: string): Promise<ReadResult> {
  try {
    const localPath = getLocalPath(serverId, filePath);

    if (!isEditable(localPath)) {
      return { success: false, error: 'File type not editable', binary: true };
    }

    const content = await fs.readFile(localPath, 'utf-8');
    return { success: true, content, path: filePath };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function writeContentLocal(filePath: string, content: string, serverId: string): Promise<OperationResult> {
  try {
    const localPath = getLocalPath(serverId, filePath);
    await fs.writeFile(localPath, content, 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function uploadLocal(
  targetDir: string,
  fileName: string,
  fileBuffer: Buffer,
  serverId: string
): Promise<OperationResult & { fileName?: string }> {
  try {
    const localDirPath = getLocalPath(serverId, targetDir);

    if (!isAllowedUpload(fileName)) {
      throw new Error(`File type not allowed: ${path.extname(fileName)}`);
    }

    const fullPath = path.join(localDirPath, fileName);
    await fs.writeFile(fullPath, fileBuffer);
    return { success: true, fileName };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function downloadLocal(
  filePath: string,
  serverId: string
): Promise<{
  success: boolean;
  localPath?: string;
  fileName?: string;
  error?: string;
}> {
  try {
    const localPath = getLocalPath(serverId, filePath);
    await fs.access(localPath);
    return { success: true, localPath, fileName: path.basename(localPath) };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function checkServerFilesLocal(serverId: string): Promise<ServerFilesStatus> {
  try {
    const serverDataPath = getServerDataPath(serverId);
    const entries = await fs.readdir(serverDataPath);
    const hasJar = entries.some((f) => f === 'HytaleServer.jar');
    const hasAssets = entries.some((f) => f === 'Assets.zip');
    return { hasJar, hasAssets, ready: hasJar && hasAssets };
  } catch {
    return { hasJar: false, hasAssets: false, ready: false };
  }
}

export async function checkAuthLocal(serverId: string): Promise<boolean> {
  try {
    const serverDataPath = getServerDataPath(serverId);
    const credPath = path.join(serverDataPath, '.hytale-downloader-credentials.json');
    const content = await fs.readFile(credPath, 'utf-8');
    return content.includes('access_token');
  } catch {
    return false;
  }
}

export async function wipeDataLocal(serverId: string): Promise<OperationResult> {
  try {
    const serverDataPath = getServerDataPath(serverId);
    const dirs = ['universe', 'logs', 'config', '.cache'];
    const filesToDelete = ['.download_attempted', '.hytale-downloader-credentials.json'];

    for (const dir of dirs) {
      try {
        await fs.rm(path.join(serverDataPath, dir), {
          recursive: true,
          force: true
        });
        await fs.mkdir(path.join(serverDataPath, dir), { recursive: true });
      } catch {
        // Ignore if doesn't exist
      }
    }

    for (const file of filesToDelete) {
      try {
        await fs.unlink(path.join(serverDataPath, file));
      } catch {
        // Ignore if doesn't exist
      }
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function copyItemLocal(srcPath: string, destPath: string, serverId: string): Promise<OperationResult> {
  try {
    const localSrc = getLocalPath(serverId, srcPath);
    const localDest = getLocalPath(serverId, destPath);

    const stat = await fs.stat(localSrc);
    if (stat.isDirectory()) {
      await copyDirRecursive(localSrc, localDest);
    } else {
      await fs.copyFile(localSrc, localDest);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
