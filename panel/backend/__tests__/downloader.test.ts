import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Socket } from 'socket.io';
import type { Container } from 'dockerode';

const mockExec = { start: jest.fn<() => Promise<unknown>>() };
const mockContainer = { exec: jest.fn(() => Promise.resolve(mockExec)) } as unknown as Container;

const mockGetContainer = jest.fn<() => Promise<Container | null>>();
const mockExecCommand = jest.fn<(cmd: string, timeout?: number) => Promise<string>>();
const mockGetStatus = jest.fn<() => Promise<{ running: boolean; status: string }>>();
const mockCheckServerFiles = jest.fn<() => Promise<{ hasJar: boolean; hasAssets: boolean; ready: boolean }>>();
const mockCheckAuth = jest.fn<() => Promise<boolean>>();

jest.unstable_mockModule('../src/services/docker.js', () => ({
  getContainer: mockGetContainer,
  execCommand: mockExecCommand,
  getStatus: mockGetStatus
}));

jest.unstable_mockModule('../src/services/files.js', () => ({
  checkServerFiles: mockCheckServerFiles,
  checkAuth: mockCheckAuth
}));

const { downloadServerFiles } = await import('../src/services/downloader.js');

describe('Downloader Service', () => {
  let mockSocket: { emit: ReturnType<typeof jest.fn> };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = { emit: jest.fn() };
    mockGetContainer.mockResolvedValue(mockContainer);
    mockExecCommand.mockResolvedValue('');
    mockGetStatus.mockResolvedValue({ running: true, status: 'running' });
    mockCheckServerFiles.mockResolvedValue({ hasJar: false, hasAssets: false, ready: false });
    mockCheckAuth.mockResolvedValue(false);
  });

  const createMockStream = (dataToEmit: string | null, triggerError = false) => ({
    on: jest.fn((event: string, cb: (data?: Buffer | Error) => void) => {
      if (event === 'data' && dataToEmit) cb(Buffer.from(dataToEmit));
      if (event === 'end' && !triggerError) setTimeout(() => cb(), 10);
      if (event === 'error' && triggerError) setTimeout(() => cb(new Error('Stream failed')), 10);
      return { on: jest.fn().mockReturnThis() };
    })
  });

  test('emits semantic error when container is not running', async () => {
    mockGetStatus.mockResolvedValue({ running: false, status: 'exited' });
    await downloadServerFiles(mockSocket as unknown as Socket);
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'error',
      code: 'CONTAINER_NOT_RUNNING',
      message: 'Server is offline. Start it from Control tab and try again.'
    });
  });

  test('emits semantic error when container not found', async () => {
    mockGetContainer.mockResolvedValue(null);
    await downloadServerFiles(mockSocket as unknown as Socket);
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'error',
      code: 'CONTAINER_NOT_FOUND',
      message: 'Server container was not found. Check your server setup.'
    });
  });

  test('emits starting status on begin', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null));
    mockExecCommand.mockResolvedValue('NO_ZIP');

    await downloadServerFiles(mockSocket as unknown as Socket);

    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'starting',
      message: 'Starting download...'
    });
  });

  test('emits auth-required when OAuth URL or user_code detected', async () => {
    mockExec.start.mockResolvedValue(createMockStream('Visit oauth.accounts.hytale.com'));
    mockExecCommand.mockResolvedValue('NO_ZIP');

    await downloadServerFiles(mockSocket as unknown as Socket);

    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'auth-required',
      message: expect.stringContaining('oauth.accounts.hytale.com')
    });
  });

  test('emits error on 403 Forbidden', async () => {
    mockExec.start.mockResolvedValue(createMockStream('403 Forbidden'));
    mockExecCommand.mockResolvedValue('NO_ZIP');

    await downloadServerFiles(mockSocket as unknown as Socket);

    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'error',
      message: 'Authentication failed or expired. Try again.'
    });
  });

  test('extracts files when zip found', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null));
    mockExecCommand.mockImplementation((cmd: string) =>
      cmd.includes('ls /tmp/hytale-game.zip')
        ? Promise.resolve('/tmp/hytale-game.zip')
        : Promise.resolve('')
    );
    mockCheckServerFiles.mockResolvedValue({ hasJar: true, hasAssets: true, ready: true });

    await downloadServerFiles(mockSocket as unknown as Socket);
    await new Promise(r => setTimeout(r, 50));

    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'extracting',
      message: 'Extracting files...'
    });
  });

  test('handles stream error', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null, true));

    await downloadServerFiles(mockSocket as unknown as Socket);
    await new Promise(r => setTimeout(r, 50));

    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'error',
      message: 'Stream failed'
    });
  });
});
