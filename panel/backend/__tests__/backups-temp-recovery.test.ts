import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const fsState = {
  dirs: new Set<string>(),
  files: new Map<string, string>(),
  tempDirPath: '/tmp/hytale-backup-test',
  mkdtempCalls: 0
};

const normalizePath = (input: string): string => input.replaceAll('\\', '/');
const dirname = (input: string): string => normalizePath(path.posix.dirname(input));
const basename = (input: string): string => path.posix.basename(normalizePath(input));

const ensureDir = (input: string): void => {
  const normalized = normalizePath(input);
  if (!normalized || normalized === '.') return;
  const segments = normalized.split('/').filter(Boolean);
  let current = normalized.startsWith('/') ? '/' : '';
  for (const segment of segments) {
    current = current === '/' ? `/${segment}` : current ? `${current}/${segment}` : segment;
    fsState.dirs.add(current);
  }
  if (normalized === '/') fsState.dirs.add('/');
};

const ensureDirForFile = (filePath: string): void => {
  ensureDir(dirname(filePath));
};

const listDirEntries = (dirPath: string): string[] => {
  const normalizedDir = normalizePath(dirPath).replace(/\/+$/, '');
  const prefix = normalizedDir === '' ? '' : `${normalizedDir}/`;
  const entries = new Set<string>();

  for (const filePath of fsState.files.keys()) {
    if (!filePath.startsWith(prefix)) continue;
    const rest = filePath.slice(prefix.length);
    if (!rest || rest.includes('/')) continue;
    entries.add(rest);
  }

  for (const dir of fsState.dirs) {
    if (!dir.startsWith(prefix) || dir === normalizedDir || dir === `${normalizedDir}/`) continue;
    const rest = dir.slice(prefix.length).replace(/^\/+/, '');
    if (!rest || rest.includes('/')) continue;
    entries.add(rest);
  }

  return [...entries];
};

const fsPromisesMock = {
  mkdtemp: jest.fn(async () => {
    fsState.mkdtempCalls += 1;
    const dir = `${fsState.tempDirPath}-${fsState.mkdtempCalls}`;
    ensureDir(dir);
    return dir;
  }),
  mkdir: jest.fn(async (dirPath: string) => {
    ensureDir(dirPath);
  }),
  access: jest.fn(async (targetPath: string) => {
    const normalized = normalizePath(targetPath);
    if (!fsState.dirs.has(normalized) && !fsState.files.has(normalized)) {
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }
  }),
  readdir: jest.fn(async (dirPath: string) => {
    const normalized = normalizePath(dirPath);
    if (!fsState.dirs.has(normalized)) {
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }
    return listDirEntries(normalized);
  }),
  writeFile: jest.fn(async (filePath: string, content: string | Buffer) => {
    const normalized = normalizePath(filePath);
    ensureDirForFile(normalized);
    fsState.files.set(normalized, Buffer.isBuffer(content) ? content.toString('utf8') : String(content));
  }),
  readFile: jest.fn(async (filePath: string) => {
    const normalized = normalizePath(filePath);
    if (!fsState.files.has(normalized)) {
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }
    return fsState.files.get(normalized) as string;
  }),
  rename: jest.fn(async (fromPath: string, toPath: string) => {
    const from = normalizePath(fromPath);
    const to = normalizePath(toPath);
    if (!fsState.files.has(from)) {
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }
    ensureDirForFile(to);
    const value = fsState.files.get(from) as string;
    fsState.files.delete(from);
    fsState.files.set(to, value);
  }),
  unlink: jest.fn(async (filePath: string) => {
    const normalized = normalizePath(filePath);
    if (!fsState.files.has(normalized)) {
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }
    fsState.files.delete(normalized);
  }),
  rm: jest.fn(async (targetPath: string) => {
    const normalized = normalizePath(targetPath);
    fsState.files.delete(normalized);
  }),
  stat: jest.fn(async (filePath: string) => {
    const normalized = normalizePath(filePath);
    if (!fsState.files.has(normalized)) {
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }
    const size = (fsState.files.get(normalized) as string).length;
    return { size } as { size: number };
  })
};

const streamState = {
  shouldErrorOutput: false
};

const createWriteStreamMock = jest.fn((targetPath: string) => {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  const normalized = normalizePath(targetPath);

  const emit = (event: string, payload?: unknown): void => {
    const fns = listeners.get(event) || [];
    for (const fn of fns) {
      fn(payload);
    }
  };

  const stream = {
    on: (event: string, cb: (...args: unknown[]) => void) => {
      const current = listeners.get(event) || [];
      current.push(cb);
      listeners.set(event, current);
      return stream;
    },
    destroy: (err?: Error) => {
      if (err) emit('error', err);
    },
    __path: normalized,
    __emitClose: () => emit('close')
  };

  return stream;
});

const archiverMockFactory = jest.fn(() => {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  let pipedStream: ReturnType<typeof createWriteStreamMock> | null = null;

  const emit = (event: string, payload?: unknown): void => {
    const fns = listeners.get(event) || [];
    for (const fn of fns) fn(payload);
  };

  return {
    pipe: (stream: ReturnType<typeof createWriteStreamMock>) => {
      pipedStream = stream;
    },
    on: (event: string, cb: (...args: unknown[]) => void) => {
      const current = listeners.get(event) || [];
      current.push(cb);
      listeners.set(event, current);
    },
    directory: () => undefined,
    glob: () => undefined,
    finalize: async () => {
      if (!pipedStream) return;
      if (streamState.shouldErrorOutput) {
        emit('error', new Error('forced archive failure'));
        pipedStream.destroy(new Error('forced output failure'));
        return;
      }
      ensureDirForFile(pipedStream.__path);
      fsState.files.set(pipedStream.__path, 'zip-content');
      pipedStream.__emitClose();
    },
    abort: () => undefined
  };
});

jest.unstable_mockModule('node:fs/promises', () => ({
  default: fsPromisesMock,
  ...fsPromisesMock
}));

jest.unstable_mockModule('node:fs', () => {
  return {
    createWriteStream: createWriteStreamMock
  };
});

jest.unstable_mockModule('archiver', () => ({
  default: archiverMockFactory
}));

jest.unstable_mockModule('extract-zip', () => ({
  default: jest.fn(async () => undefined)
}));

jest.unstable_mockModule('../src/config/index.js', () => ({
  default: {
    data: {
      path: '/tmp/hytale-backup-test'
    }
  }
}));

const { createBackup, listBackups } = await import('../src/services/backups.js');

describe('Backups temp recovery', () => {
  const serverId = 'srv-temp-recovery';
  const backupsDir = `/tmp/hytale-backup-test/servers/${serverId}/backups`;
  const serverDir = `/tmp/hytale-backup-test/servers/${serverId}/server`;

  beforeEach(async () => {
    jest.clearAllMocks();
    streamState.shouldErrorOutput = false;
    fsState.files.clear();
    fsState.dirs.clear();
    fsState.mkdtempCalls = 0;

    ensureDir('/tmp');
    ensureDir('/tmp/hytale-backup-test');
    ensureDir('/tmp/hytale-backup-test/servers');
    ensureDir(`/tmp/hytale-backup-test/servers/${serverId}`);
    ensureDir(backupsDir);
    ensureDir(serverDir);
    ensureDir(`${serverDir}/universe`);
    ensureDir(`${serverDir}/config`);
    ensureDir(`${serverDir}/mods`);
    ensureDir(`${serverDir}/logs`);
  });

  afterEach(() => {
    streamState.shouldErrorOutput = false;
  });

  test('removes stale .tmp backups before creating a new backup', async () => {
    const staleTemp = `${backupsDir}/backup-2026-03-09T08-11-56-171-3venkk.zip.tmp`;
    fsState.files.set(staleTemp, 'stale-content');

    const result = await createBackup(serverId);
    expect(result.success).toBe(true);

    const backups = await listBackups(serverId);
    expect(backups.success).toBe(true);
    expect(backups.backups.length).toBe(1);
    expect(fsState.files.has(staleTemp)).toBe(false);
  });

  test('cleans temporary backup file when backup creation fails', async () => {
    streamState.shouldErrorOutput = true;
    const result = await createBackup(serverId);
    expect(result.success).toBe(false);

    const tempFiles = [...fsState.files.keys()].filter((entry) => entry.endsWith('.tmp'));
    expect(tempFiles.length).toBe(0);

    streamState.shouldErrorOutput = false;
    const retryResult = await createBackup(serverId);
    expect(retryResult.success).toBe(true);
  });
});
