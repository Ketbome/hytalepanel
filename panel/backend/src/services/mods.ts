import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import tar from 'tar-stream';
import config from '../config/index.js';
import * as docker from './docker.js';
import { getServerDataPath } from './servers.js';

const MODS_DIR = config.mods?.basePath || '/opt/hytale/mods';
const METADATA_FILE = config.mods?.metadataFile || '/opt/hytale/mods.json';

export interface InstalledMod {
  id: string;
  providerId: string;
  projectId: string | null;
  projectSlug?: string | null;
  projectTitle: string;
  projectIconUrl: string | null;
  versionId: string | null;
  versionName: string;
  classification: string;
  fileName: string;
  fileSize: number;
  enabled: boolean;
  installedAt: string;
  updatedAt: string;
  isLocal?: boolean;
  fileExists?: boolean;
}

export interface ModsData {
  version: number;
  apiKey: string | null;
  mods: InstalledMod[];
}

export interface ModMetadata {
  providerId?: string;
  projectId?: string;
  projectSlug?: string | null;
  projectTitle: string;
  projectIconUrl?: string | null;
  versionId?: string;
  versionName: string;
  classification?: string;
  fileName?: string;
}

export interface ModsContext {
  containerName?: string;
  serverId?: string;
}

type ModsContextInput = ModsContext | string | undefined;

type StorageBackend =
  | {
      mode: 'docker';
      containerName?: string;
      modsDir: string;
      metadataFile: string;
    }
  | {
      mode: 'local';
      serverId: string;
      modsDir: string;
      metadataFile: string;
    };

export interface OperationResult {
  success: boolean;
  error?: string;
}

export interface ModResult extends OperationResult {
  mod?: InstalledMod | null;
}

export interface ModsListResult extends OperationResult {
  mods: InstalledMod[];
}

function normalizeContext(context?: ModsContextInput): ModsContext {
  if (!context) return {};
  if (typeof context === 'string') {
    return { containerName: context };
  }
  return context;
}

function getDefaultModsData(): ModsData {
  return { version: 1, apiKey: null, mods: [] };
}

async function resolveBackend(context?: ModsContextInput): Promise<StorageBackend> {
  const ctx = normalizeContext(context);

  if (ctx.containerName) {
    const status = await docker.getStatus(ctx.containerName);
    if (status.running) {
      return {
        mode: 'docker',
        containerName: ctx.containerName,
        modsDir: MODS_DIR,
        metadataFile: METADATA_FILE
      };
    }
  }

  if (ctx.serverId) {
    const serverDataPath = getServerDataPath(ctx.serverId);
    return {
      mode: 'local',
      serverId: ctx.serverId,
      modsDir: path.join(serverDataPath, 'mods'),
      metadataFile: path.join(serverDataPath, 'mods.json')
    };
  }

  return {
    mode: 'docker',
    containerName: ctx.containerName,
    modsDir: MODS_DIR,
    metadataFile: METADATA_FILE
  };
}

async function ensureModsSetup(backend: StorageBackend): Promise<OperationResult> {
  try {
    if (backend.mode === 'docker') {
      await docker.execCommand(`mkdir -p "${backend.modsDir}"`, 5000, backend.containerName);
      const checkResult = await docker.execCommand(
        `cat "${backend.metadataFile}" 2>/dev/null || echo "NOT_FOUND"`,
        30000,
        backend.containerName
      );

      if (checkResult.includes('NOT_FOUND')) {
        const initialData = JSON.stringify(getDefaultModsData(), null, 2);
        const pack = tar.pack();
        pack.entry({ name: path.basename(backend.metadataFile) }, initialData);
        pack.finalize();
        await docker.putArchive(pack, { path: path.dirname(backend.metadataFile) }, backend.containerName);
      }
      return { success: true };
    }

    await fs.mkdir(backend.modsDir, { recursive: true });
    try {
      await fs.access(backend.metadataFile);
    } catch {
      await fs.writeFile(backend.metadataFile, JSON.stringify(getDefaultModsData(), null, 2), 'utf8');
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function loadMods(backend: StorageBackend): Promise<{ success: boolean; data: ModsData; error?: string }> {
  try {
    await ensureModsSetup(backend);

    if (backend.mode === 'docker') {
      const stream = await docker.getArchive(backend.metadataFile, backend.containerName);

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
          try {
            const data = JSON.parse(content) as ModsData;
            resolve({ success: true, data });
          } catch {
            resolve({ success: true, data: getDefaultModsData() });
          }
        });

        extract.on('error', reject);
        stream.pipe(extract);
      });
    }

    try {
      const content = await fs.readFile(backend.metadataFile, 'utf8');
      return { success: true, data: JSON.parse(content) as ModsData };
    } catch {
      return { success: true, data: getDefaultModsData() };
    }
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      data: getDefaultModsData()
    };
  }
}

async function saveMods(modsData: ModsData, backend: StorageBackend): Promise<OperationResult> {
  try {
    const content = JSON.stringify(modsData, null, 2);

    if (backend.mode === 'docker') {
      const pack = tar.pack();
      pack.entry({ name: path.basename(backend.metadataFile) }, content);
      pack.finalize();

      await docker.putArchive(pack, { path: path.dirname(backend.metadataFile) }, backend.containerName);
      return { success: true };
    }

    await fs.writeFile(backend.metadataFile, content, 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function listModFiles(backend: StorageBackend): Promise<Array<{ fileName: string; fileSize: number }>> {
  if (backend.mode === 'docker') {
    const lsResult = await docker.execCommand(
      `ls -la "${backend.modsDir}" 2>/dev/null | grep -E "\\.(jar|disabled|zip)$" || echo ""`,
      30000,
      backend.containerName
    );

    const filesInDir: Array<{ fileName: string; fileSize: number }> = [];
    for (const line of lsResult.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 9) {
        const fileName = parts.slice(8).join(' ');
        const fileSize = Number.parseInt(parts[4], 10) || 0;
        if (fileName.endsWith('.jar') || fileName.endsWith('.disabled') || fileName.endsWith('.zip')) {
          filesInDir.push({ fileName, fileSize });
        }
      }
    }
    return filesInDir;
  }

  await fs.mkdir(backend.modsDir, { recursive: true });
  const entries = await fs.readdir(backend.modsDir, { withFileTypes: true });
  const filesInDir: Array<{ fileName: string; fileSize: number }> = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const fileName = entry.name;
    if (!fileName.endsWith('.jar') && !fileName.endsWith('.disabled') && !fileName.endsWith('.zip')) continue;

    const stat = await fs.stat(path.join(backend.modsDir, fileName));
    filesInDir.push({ fileName, fileSize: stat.size });
  }

  return filesInDir;
}

async function writeModFile(backend: StorageBackend, fileName: string, fileBuffer: Buffer): Promise<void> {
  if (backend.mode === 'docker') {
    const pack = tar.pack();
    pack.entry({ name: fileName }, fileBuffer);
    pack.finalize();
    await docker.putArchive(pack, { path: backend.modsDir }, backend.containerName);
    return;
  }

  await fs.mkdir(backend.modsDir, { recursive: true });
  await fs.writeFile(path.join(backend.modsDir, fileName), fileBuffer);
}

async function removeModFiles(backend: StorageBackend, fileName: string): Promise<void> {
  if (backend.mode === 'docker') {
    await docker.execCommand(
      `rm -f "${backend.modsDir}/${fileName}" "${backend.modsDir}/${fileName}.disabled"`,
      5000,
      backend.containerName
    );
    return;
  }

  await fs.rm(path.join(backend.modsDir, fileName), { force: true });
  await fs.rm(path.join(backend.modsDir, `${fileName}.disabled`), { force: true });
}

async function existsFile(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function setEnabledState(backend: StorageBackend, fileName: string, enabled: boolean): Promise<void> {
  if (backend.mode === 'docker') {
    const disabledPath = `${backend.modsDir}/${fileName}.disabled`;
    const enabledPath = `${backend.modsDir}/${fileName}`;

    if (enabled) {
      const checkResult = await docker.execCommand(
        `test -f "${disabledPath}" && echo "EXISTS" || echo "NOT_FOUND"`,
        30000,
        backend.containerName
      );
      if (checkResult.includes('EXISTS')) {
        await docker.execCommand(`mv "${disabledPath}" "${enabledPath}"`, 5000, backend.containerName);
      }
    } else {
      const checkResult = await docker.execCommand(
        `test -f "${enabledPath}" && echo "EXISTS" || echo "NOT_FOUND"`,
        30000,
        backend.containerName
      );
      if (checkResult.includes('EXISTS')) {
        await docker.execCommand(`mv "${enabledPath}" "${disabledPath}"`, 5000, backend.containerName);
      }
    }
    return;
  }

  const disabledPath = path.join(backend.modsDir, `${fileName}.disabled`);
  const enabledPath = path.join(backend.modsDir, fileName);

  if (enabled) {
    if (await existsFile(disabledPath)) {
      await fs.rename(disabledPath, enabledPath);
    }
  } else if (await existsFile(enabledPath)) {
    await fs.rename(enabledPath, disabledPath);
  }
}

export async function listInstalledMods(context?: ModsContextInput): Promise<ModsListResult> {
  try {
    const backend = await resolveBackend(context);
    const result = await loadMods(backend);
    if (!result.success) {
      return { success: false, error: result.error, mods: [] };
    }

    const filesInDir = await listModFiles(backend);

    const knownFileNames = new Set(result.data.mods.map((m) => m.fileName));
    const knownFileNamesDisabled = new Set(result.data.mods.map((m) => `${m.fileName}.disabled`));
    const existingFiles = new Set(filesInDir.map((f) => f.fileName));

    const syncedMods = result.data.mods
      .map((mod) => {
        const enabledExists = existingFiles.has(mod.fileName);
        const disabledExists = existingFiles.has(`${mod.fileName}.disabled`);

        return {
          ...mod,
          enabled: enabledExists && !disabledExists,
          fileExists: enabledExists || disabledExists
        };
      })
      .filter((mod) => mod.fileExists);
    const mods: InstalledMod[] = [...syncedMods];

    let needsSave = false;
    for (const file of filesInDir) {
      const baseFileName = file.fileName.replace('.disabled', '');

      if (knownFileNames.has(baseFileName) || knownFileNames.has(file.fileName)) {
        continue;
      }
      if (knownFileNamesDisabled.has(file.fileName)) {
        continue;
      }

      const isDisabled = file.fileName.endsWith('.disabled');
      const actualFileName = isDisabled ? file.fileName.replace('.disabled', '') : file.fileName;
      const modName = actualFileName.replace(/\.(jar|zip)$/, '').replace(/-/g, ' ');

      const newMod: InstalledMod = {
        id: crypto.randomUUID(),
        providerId: 'local',
        projectId: null,
        projectTitle: modName,
        projectIconUrl: null,
        versionId: null,
        versionName: 'Unknown',
        classification: 'PLUGIN',
        fileName: actualFileName,
        fileSize: file.fileSize,
        enabled: !isDisabled,
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLocal: true,
        fileExists: true
      };

      mods.push(newMod);
      result.data.mods.push(newMod);
      knownFileNames.add(actualFileName);
      needsSave = true;
    }

    if (needsSave) {
      await saveMods(result.data, backend);
    }

    return { success: true, mods };
  } catch (e) {
    return { success: false, error: (e as Error).message, mods: [] };
  }
}

export async function installMod(
  fileBuffer: Buffer,
  metadata: ModMetadata,
  context?: ModsContextInput
): Promise<ModResult> {
  try {
    const backend = await resolveBackend(context);
    await ensureModsSetup(backend);

    const modId = crypto.randomUUID();
    const fileName =
      metadata.fileName || `${metadata.projectTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${metadata.versionName}.jar`;

    await writeModFile(backend, fileName, fileBuffer);

    const result = await loadMods(backend);
    const modsData = result.data;

    const existingIndex = modsData.mods.findIndex(
      (m) => m.providerId === metadata.providerId && m.projectId === metadata.projectId
    );

    const modEntry: InstalledMod = {
      id: existingIndex >= 0 ? modsData.mods[existingIndex].id : modId,
      providerId: metadata.providerId || 'modtale',
      projectId: metadata.projectId || null,
      projectSlug: metadata.projectSlug || null,
      projectTitle: metadata.projectTitle,
      projectIconUrl: metadata.projectIconUrl || null,
      versionId: metadata.versionId || null,
      versionName: metadata.versionName,
      classification: metadata.classification || 'PLUGIN',
      fileName,
      fileSize: fileBuffer.length,
      enabled: true,
      installedAt: existingIndex >= 0 ? modsData.mods[existingIndex].installedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      if (modsData.mods[existingIndex].fileName !== fileName) {
        await removeModFiles(backend, modsData.mods[existingIndex].fileName);
      }
      modsData.mods[existingIndex] = modEntry;
    } else {
      modsData.mods.push(modEntry);
    }

    await saveMods(modsData, backend);

    return { success: true, mod: modEntry };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function uninstallMod(modId: string, context?: ModsContextInput): Promise<OperationResult> {
  try {
    const backend = await resolveBackend(context);
    const result = await loadMods(backend);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const modIndex = modsData.mods.findIndex((m) => m.id === modId);

    if (modIndex < 0) {
      return { success: false, error: 'Mod not found' };
    }

    const mod = modsData.mods[modIndex];
    await removeModFiles(backend, mod.fileName);

    modsData.mods.splice(modIndex, 1);
    await saveMods(modsData, backend);

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function enableMod(modId: string, context?: ModsContextInput): Promise<ModResult> {
  try {
    const backend = await resolveBackend(context);
    const result = await loadMods(backend);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const mod = modsData.mods.find((m) => m.id === modId);

    if (!mod) {
      return { success: false, error: 'Mod not found' };
    }

    await setEnabledState(backend, mod.fileName, true);

    mod.enabled = true;
    mod.updatedAt = new Date().toISOString();
    await saveMods(modsData, backend);

    return { success: true, mod };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function disableMod(modId: string, context?: ModsContextInput): Promise<ModResult> {
  try {
    const backend = await resolveBackend(context);
    const result = await loadMods(backend);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const mod = modsData.mods.find((m) => m.id === modId);

    if (!mod) {
      return { success: false, error: 'Mod not found' };
    }

    await setEnabledState(backend, mod.fileName, false);

    mod.enabled = false;
    mod.updatedAt = new Date().toISOString();
    await saveMods(modsData, backend);

    return { success: true, mod };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getMod(modId: string, context?: ModsContextInput): Promise<ModResult> {
  try {
    const backend = await resolveBackend(context);
    const result = await loadMods(backend);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    const mod = result.data.mods.find((m) => m.id === modId);
    return { success: true, mod: mod || null };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateMod(
  modId: string,
  updates: Partial<InstalledMod>,
  context?: ModsContextInput
): Promise<ModResult> {
  try {
    const backend = await resolveBackend(context);
    const result = await loadMods(backend);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const modIndex = modsData.mods.findIndex((m) => m.id === modId);

    if (modIndex < 0) {
      return { success: false, error: 'Mod not found' };
    }

    modsData.mods[modIndex] = {
      ...modsData.mods[modIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await saveMods(modsData, backend);
    return { success: true, mod: modsData.mods[modIndex] };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
