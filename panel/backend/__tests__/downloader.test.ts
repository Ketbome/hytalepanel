import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Socket } from 'socket.io';
import type { Container } from 'dockerode';

const mockExec = { start: jest.fn<() => Promise<unknown>>() };
const mockContainer = { exec: jest.fn(() => Promise.resolve(mockExec)) } as unknown as Container;

const mockGetContainer = jest.fn<() => Promise<Container | null>>();
const mockExecCommand = jest.fn<(cmd: string, timeout?: number, containerName?: string) => Promise<string>>();
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
    mockExecCommand.mockImplementation((cmd: string) => {
      if (cmd.includes('NO_ZIP') || cmd.includes('ls /opt/hytale/.download-temp/hytale-game.zip')) {
        return Promise.resolve('NO_ZIP');
      }
      return Promise.resolve('');
    });
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
    const result = await downloadServerFiles(mockSocket as unknown as Socket);

    expect(result).toEqual({
      success: false,
      code: 'CONTAINER_NOT_RUNNING',
      error: 'Server is offline. Start it from Control tab and try again.'
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', expect.objectContaining({
      status: 'error',
      code: 'CONTAINER_NOT_RUNNING',
      message: 'Server is offline. Start it from Control tab and try again.'
    }));
  });

  test('emits semantic error when container not found', async () => {
    mockGetContainer.mockResolvedValue(null);
    const result = await downloadServerFiles(mockSocket as unknown as Socket);

    expect(result).toEqual({
      success: false,
      code: 'CONTAINER_NOT_FOUND',
      error: 'Server container was not found. Check your server setup.'
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', expect.objectContaining({
      status: 'error',
      code: 'CONTAINER_NOT_FOUND',
      message: 'Server container was not found. Check your server setup.'
    }));
  });

  test('emits starting status on begin', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null));

    const result = await downloadServerFiles(mockSocket as unknown as Socket);

    expect(result.success).toBe(false);
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', expect.objectContaining({
      status: 'starting',
      message: 'Starting download...'
    }));
  });

  test('passes -patchline pre-release to hytale-downloader for pre-release channel', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null));

    await downloadServerFiles(mockSocket as unknown as Socket, undefined, undefined, 'pre-release');

    expect(mockContainer.exec).toHaveBeenCalledWith(
      expect.objectContaining({
        Cmd: ['sh', '-c', expect.stringContaining('-patchline pre-release')]
      })
    );
  });

  test('omits -patchline flag for stable channel', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null));

    await downloadServerFiles(mockSocket as unknown as Socket, undefined, undefined, 'stable');

    const execArgs = (mockContainer.exec as jest.Mock).mock.calls[0][0] as { Cmd: string[] };
    expect(execArgs.Cmd[2]).not.toContain('-patchline');
  });

  test('emits auth-required when OAuth URL or user_code detected', async () => {
    mockExec.start.mockResolvedValue(createMockStream('Visit oauth.accounts.hytale.com'));

    const result = await downloadServerFiles(mockSocket as unknown as Socket);

    expect(result).toEqual({
      success: false,
      code: 'DOWNLOAD_FAILED',
      error: 'Download finished without files. Complete authentication and retry.'
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', expect.objectContaining({
      status: 'auth-required',
      message: expect.stringContaining('oauth.accounts.hytale.com')
    }));
  });

  test('emits error on 403 Forbidden', async () => {
    mockExec.start.mockResolvedValue(createMockStream('403 Forbidden'));

    const result = await downloadServerFiles(mockSocket as unknown as Socket);

    expect(result).toEqual({
      success: false,
      code: 'DOWNLOAD_FAILED',
      error: 'Authentication failed or expired. Try again.'
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', expect.objectContaining({
      status: 'error',
      message: 'Authentication failed or expired. Try again.'
    }));
  });

  test('clears credentials and returns auth-expired error on invalid_grant', async () => {
    mockExec.start.mockResolvedValue(createMockStream('oauth2: "invalid_grant" "The refresh token expired."'));

    const result = await downloadServerFiles(mockSocket as unknown as Socket);

    expect(result).toEqual({
      success: false,
      code: 'DOWNLOAD_FAILED',
      error: 'Authentication expired. Stored downloader credentials were cleared. Start download again to re-authenticate.'
    });

    expect(mockExecCommand).toHaveBeenCalledWith(
      'rm -f /opt/hytale/.hytale-downloader-credentials.json',
      30000,
      undefined
    );

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'download-status',
      expect.objectContaining({
        status: 'error',
        message:
          'Authentication expired. Stored downloader credentials were cleared. Start download again to re-authenticate.'
      })
    );
  });

  test('extracts files when zip found', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null));
    mockExecCommand.mockImplementation((cmd: string) =>
      cmd.includes('ls /opt/hytale/.download-temp/hytale-game.zip')
        ? Promise.resolve('/opt/hytale/.download-temp/hytale-game.zip')
        : Promise.resolve('')
    );
    mockCheckServerFiles.mockResolvedValue({ hasJar: true, hasAssets: true, ready: true });

    const result = await downloadServerFiles(mockSocket as unknown as Socket);

    expect(result).toEqual({ success: true });
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', expect.objectContaining({
      status: 'extracting',
      message: 'Extracting files...'
    }));
  });

  test('handles stream error', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null, true));

    const result = await downloadServerFiles(mockSocket as unknown as Socket);

    expect(result).toEqual({
      success: false,
      code: 'DOWNLOAD_FAILED',
      error: 'Stream failed'
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', expect.objectContaining({
      status: 'error',
      code: 'DOWNLOAD_FAILED',
      message: 'Stream failed'
    }));
  });
});
