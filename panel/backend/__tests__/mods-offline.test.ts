import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let tempDir = '';

const mockConfig = {
  timezone: 'UTC',
  container: { name: 'hytale-server' },
  server: { port: 3000, basePath: '' },
  docker: { socketPath: '/var/run/docker.sock' },
  auth: {
    username: 'admin',
    password: 'admin',
    jwtSecret: 'test',
    tokenExpiry: '24h',
    disabled: false
  },
  files: {
    basePath: '/opt/hytale',
    maxUploadSize: 500 * 1024 * 1024,
    editableExtensions: ['.json', '.txt'],
    uploadAllowedExtensions: ['.jar', '.zip']
  },
  mods: {
    basePath: '/opt/hytale/mods',
    metadataFile: '/opt/hytale/mods.json',
    maxModSize: 50 * 1024 * 1024
  },
  modtale: { apiKey: null },
  curseforge: { apiKey: null },
  data: { path: '', hostPath: './data' }
};

const mockGetStatus = jest.fn<() => Promise<{ running: boolean; status: string }>>();
const mockExecCommand = jest.fn<(cmd: string, timeout?: number, containerName?: string) => Promise<string>>();
const mockGetArchive = jest.fn();
const mockPutArchive = jest.fn();

jest.unstable_mockModule('../src/config/index.js', () => ({
  default: mockConfig
}));

jest.unstable_mockModule('../src/services/docker.js', () => ({
  getStatus: mockGetStatus,
  execCommand: mockExecCommand,
  getArchive: mockGetArchive,
  putArchive: mockPutArchive
}));

jest.unstable_mockModule('../src/services/servers.js', () => ({
  getServerDataPath: (id: string) => path.join(tempDir, 'servers', id, 'server')
}));

const mods = await import('../src/services/mods.js');

function getServerPath(serverId: string): string {
  return path.join(tempDir, 'servers', serverId, 'server');
}

beforeAll(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hytale-mods-offline-test-'));
  mockConfig.data.path = tempDir;
});

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockGetStatus.mockResolvedValue({ running: false, status: 'exited' });
});

describe('Mods Service Offline Filesystem Mode', () => {
  test('lists installed mods offline from local filesystem', async () => {
    const serverId = 'srv-list';
    const modsDir = path.join(getServerPath(serverId), 'mods');
    await fs.mkdir(modsDir, { recursive: true });
    await fs.writeFile(path.join(modsDir, 'Lootr-0.0.8.jar'), Buffer.from('jar'));

    const result = await mods.listInstalledMods({ serverId, containerName: 'hytale-srv-list' });

    expect(result.success).toBe(true);
    expect(result.mods.some((m) => m.fileName === 'Lootr-0.0.8.jar')).toBe(true);
    expect(mockExecCommand).not.toHaveBeenCalled();
  });

  test('install/disable/enable/uninstall works offline', async () => {
    const serverId = 'srv-write';
    const context = { serverId, containerName: 'hytale-srv-write' };

    const installResult = await mods.installMod(
      Buffer.from('mod-bytes'),
      {
        providerId: 'local',
        projectTitle: 'Offline Test Mod',
        versionName: '1.0.0',
        fileName: 'OfflineTest-1.0.0.jar'
      },
      context
    );

    expect(installResult.success).toBe(true);
    expect(installResult.mod).toBeDefined();

    const modFile = path.join(getServerPath(serverId), 'mods', 'OfflineTest-1.0.0.jar');
    expect(await fs.stat(modFile)).toBeDefined();

    const disableResult = await mods.disableMod(installResult.mod!.id, context);
    expect(disableResult.success).toBe(true);
    expect(await fs.stat(`${modFile}.disabled`)).toBeDefined();

    const enableResult = await mods.enableMod(installResult.mod!.id, context);
    expect(enableResult.success).toBe(true);
    expect(await fs.stat(modFile)).toBeDefined();

    const uninstallResult = await mods.uninstallMod(installResult.mod!.id, context);
    expect(uninstallResult.success).toBe(true);

    await expect(fs.stat(modFile)).rejects.toThrow();
  });
});
