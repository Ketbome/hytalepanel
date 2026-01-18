// Mock docker and files services
const mockExec = {
  start: jest.fn()
};

const mockContainer = {
  exec: jest.fn(() => Promise.resolve(mockExec))
};

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
    mockSocket = {
      emit: jest.fn()
    };
    docker.getContainer.mockResolvedValue(mockContainer);
    docker.execCommand.mockResolvedValue('');
  });

  describe('downloadServerFiles', () => {
    test('emits error when container not found', async () => {
      docker.getContainer.mockResolvedValue(null);

      await downloadServerFiles(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
        status: 'error',
        message: 'Container not found'
      });
    });

    test('emits starting status', async () => {
      const mockStream = {
        on: jest.fn((event, cb) => {
          if (event === 'end') setTimeout(cb, 10);
          return mockStream;
        })
      };
      mockExec.start.mockResolvedValue(mockStream);
      docker.execCommand.mockResolvedValue('NO_ZIP');
      files.checkServerFiles.mockResolvedValue({ exists: false });
      files.checkAuth.mockResolvedValue({ hasAuth: false });

      await downloadServerFiles(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
        status: 'starting',
        message: 'Starting download...'
      });
    });

    test('emits auth-required when oauth URL detected', async () => {
      const mockStream = {
        on: jest.fn((event, cb) => {
          if (event === 'data') {
            cb(Buffer.from('Please visit oauth.accounts.hytale.com'));
          }
          if (event === 'end') setTimeout(cb, 10);
          return mockStream;
        })
      };
      mockExec.start.mockResolvedValue(mockStream);
      docker.execCommand.mockResolvedValue('NO_ZIP');
      files.checkServerFiles.mockResolvedValue({ exists: false });
      files.checkAuth.mockResolvedValue({ hasAuth: false });

      await downloadServerFiles(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
        status: 'auth-required',
        message: expect.stringContaining('oauth.accounts.hytale.com')
      });
    });

    test('emits auth-required when user_code detected', async () => {
      const mockStream = {
        on: jest.fn((event, cb) => {
          if (event === 'data') {
            cb(Buffer.from('Enter this user_code: ABC123'));
          }
          if (event === 'end') setTimeout(cb, 10);
          return mockStream;
        })
      };
      mockExec.start.mockResolvedValue(mockStream);
      docker.execCommand.mockResolvedValue('NO_ZIP');
      files.checkServerFiles.mockResolvedValue({ exists: false });
      files.checkAuth.mockResolvedValue({ hasAuth: false });

      await downloadServerFiles(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
        status: 'auth-required',
        message: expect.stringContaining('user_code')
      });
    });

    test('emits error on 403 Forbidden', async () => {
      const mockStream = {
        on: jest.fn((event, cb) => {
          if (event === 'data') {
            cb(Buffer.from('403 Forbidden'));
          }
          if (event === 'end') setTimeout(cb, 10);
          return mockStream;
        })
      };
      mockExec.start.mockResolvedValue(mockStream);
      docker.execCommand.mockResolvedValue('NO_ZIP');
      files.checkServerFiles.mockResolvedValue({ exists: false });
      files.checkAuth.mockResolvedValue({ hasAuth: false });

      await downloadServerFiles(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
        status: 'error',
        message: 'Authentication failed or expired. Try again.'
      });
    });

    test('emits output for regular messages', async () => {
      const mockStream = {
        on: jest.fn((event, cb) => {
          if (event === 'data') {
            cb(Buffer.from('Downloading file...'));
          }
          if (event === 'end') setTimeout(cb, 10);
          return mockStream;
        })
      };
      mockExec.start.mockResolvedValue(mockStream);
      docker.execCommand.mockResolvedValue('NO_ZIP');
      files.checkServerFiles.mockResolvedValue({ exists: false });
      files.checkAuth.mockResolvedValue({ hasAuth: false });

      await downloadServerFiles(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
        status: 'output',
        message: 'Downloading file...'
      });
    });

    test('extracts files when zip found', async () => {
      const mockStream = {
        on: jest.fn((event, cb) => {
          if (event === 'end') setTimeout(cb, 10);
          return mockStream;
        })
      };
      mockExec.start.mockResolvedValue(mockStream);
      docker.execCommand.mockImplementation((cmd) => {
        if (cmd.includes('ls /tmp/hytale-game.zip')) {
          return Promise.resolve('/tmp/hytale-game.zip');
        }
        return Promise.resolve('');
      });
      files.checkServerFiles.mockResolvedValue({ exists: true });
      files.checkAuth.mockResolvedValue({ hasAuth: true });

      await downloadServerFiles(mockSocket);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
        status: 'extracting',
        message: 'Extracting files...'
      });
    });

    test('handles stream error', async () => {
      const mockStream = {
        on: jest.fn((event, cb) => {
          if (event === 'error') {
            setTimeout(() => cb(new Error('Stream failed')), 10);
          }
          return mockStream;
        })
      };
      mockExec.start.mockResolvedValue(mockStream);

      await downloadServerFiles(mockSocket);

      // Wait for error callback
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockSocket.emit).toHaveBeenCalledWith('download-status', {
        status: 'error',
        message: 'Stream failed'
      });
    });
  });
});
