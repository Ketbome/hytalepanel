// Downloader service tests - covers auth flow and error handling

const mockExec = { start: jest.fn() };
const mockContainer = { exec: jest.fn(() => Promise.resolve(mockExec)) };

jest.mock('../src/services/docker', () => ({
  getContainer: jest.fn(),
  execCommand: jest.fn()
}));

jest.mock('../src/services/files', () => ({
  checkServerFiles: jest.fn(),
  checkAuth: jest.fn()
}));

const docker = require('../src/services/docker');
const files = require('../src/services/files');
const { downloadServerFiles } = require('../src/services/downloader');

describe('Downloader Service', () => {
  let mockSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = { emit: jest.fn() };
    docker.getContainer.mockResolvedValue(mockContainer);
    docker.execCommand.mockResolvedValue('');
    files.checkServerFiles.mockResolvedValue({ exists: false });
    files.checkAuth.mockResolvedValue(false);
  });

  const createMockStream = (dataToEmit, triggerError = false) => ({
    on: jest.fn((event, cb) => {
      if (event === 'data' && dataToEmit) cb(Buffer.from(dataToEmit));
      if (event === 'end' && !triggerError) setTimeout(cb, 10);
      if (event === 'error' && triggerError) setTimeout(() => cb(new Error('Stream failed')), 10);
      return { on: jest.fn().mockReturnThis() };
    })
  });

  test('emits error when container not found', async () => {
    docker.getContainer.mockResolvedValue(null);
    await downloadServerFiles(mockSocket);
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'error',
      message: 'Container not found'
    });
  });

  test('emits starting status on begin', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null));
    docker.execCommand.mockResolvedValue('NO_ZIP');
    
    await downloadServerFiles(mockSocket);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'starting',
      message: 'Starting download...'
    });
  });

  test('emits auth-required when OAuth URL or user_code detected', async () => {
    mockExec.start.mockResolvedValue(createMockStream('Visit oauth.accounts.hytale.com'));
    docker.execCommand.mockResolvedValue('NO_ZIP');
    
    await downloadServerFiles(mockSocket);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'auth-required',
      message: expect.stringContaining('oauth.accounts.hytale.com')
    });
  });

  test('emits error on 403 Forbidden', async () => {
    mockExec.start.mockResolvedValue(createMockStream('403 Forbidden'));
    docker.execCommand.mockResolvedValue('NO_ZIP');
    
    await downloadServerFiles(mockSocket);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'error',
      message: 'Authentication failed or expired. Try again.'
    });
  });

  test('extracts files when zip found', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null));
    docker.execCommand.mockImplementation((cmd) => 
      cmd.includes('ls /tmp/hytale-game.zip') 
        ? Promise.resolve('/tmp/hytale-game.zip') 
        : Promise.resolve('')
    );
    files.checkServerFiles.mockResolvedValue({ exists: true });
    
    await downloadServerFiles(mockSocket);
    await new Promise(r => setTimeout(r, 50));
    
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'extracting',
      message: 'Extracting files...'
    });
  });

  test('handles stream error', async () => {
    mockExec.start.mockResolvedValue(createMockStream(null, true));
    
    await downloadServerFiles(mockSocket);
    await new Promise(r => setTimeout(r, 50));
    
    expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
      status: 'error',
      message: 'Stream failed'
    });
  });
});
