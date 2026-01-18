// Mock Dockerode before requiring docker service
const mockContainer = {
  inspect: jest.fn(),
  exec: jest.fn(),
  restart: jest.fn(),
  stop: jest.fn(),
  start: jest.fn(),
  logs: jest.fn(),
  getArchive: jest.fn(),
  putArchive: jest.fn()
};

const mockDocker = {
  getContainer: jest.fn(() => mockContainer)
};

jest.mock('dockerode', () => {
  return jest.fn(() => mockDocker);
});

// Now require the module
const docker = require('../src/services/docker');

describe('Docker Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getContainer', () => {
    test('returns container instance', async () => {
      const container = await docker.getContainer();
      expect(container).toBe(mockContainer);
      expect(mockDocker.getContainer).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    test('returns running status', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: {
          Running: true,
          Status: 'running',
          StartedAt: '2024-01-01T00:00:00Z',
          Health: { Status: 'healthy' }
        }
      });

      const status = await docker.getStatus();
      expect(status.running).toBe(true);
      expect(status.status).toBe('running');
      expect(status.health).toBe('healthy');
    });

    test('returns not found on error', async () => {
      mockContainer.inspect.mockRejectedValue(new Error('Not found'));

      const status = await docker.getStatus();
      expect(status.running).toBe(false);
      expect(status.status).toBe('not found');
    });

    test('handles missing health status', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: {
          Running: true,
          Status: 'running',
          StartedAt: '2024-01-01T00:00:00Z'
        }
      });

      const status = await docker.getStatus();
      expect(status.health).toBe('unknown');
    });
  });

  describe('execCommand', () => {
    test('executes command and returns output', async () => {
      const mockStream = {
        on: jest.fn((event, cb) => {
          if (event === 'data') {
            // Docker stream has 8-byte header
            const header = Buffer.alloc(8);
            const data = Buffer.from('test output');
            cb(Buffer.concat([header, data]));
          }
          if (event === 'end') {
            setTimeout(cb, 10);
          }
          return mockStream;
        })
      };

      mockContainer.exec.mockResolvedValue({
        start: jest.fn().mockResolvedValue(mockStream)
      });

      const output = await docker.execCommand('echo test');
      expect(output).toContain('test output');
    });

    test('handles stream error', async () => {
      const mockStream = {
        on: jest.fn((event, cb) => {
          if (event === 'error') {
            setTimeout(() => cb(new Error('Stream error')), 10);
          }
          return mockStream;
        })
      };

      mockContainer.exec.mockResolvedValue({
        start: jest.fn().mockResolvedValue(mockStream)
      });

      await expect(docker.execCommand('test')).rejects.toThrow('Stream error');
    });
  });

  describe('sendCommand', () => {
    test('sends command successfully', async () => {
      const mockStream = {
        on: jest.fn((event, cb) => {
          if (event === 'end') setTimeout(cb, 10);
          return mockStream;
        })
      };

      mockContainer.exec.mockResolvedValue({
        start: jest.fn().mockResolvedValue(mockStream)
      });

      const result = await docker.sendCommand('test command');
      expect(result.success).toBe(true);
    });

    test('handles send failure', async () => {
      mockContainer.exec.mockRejectedValue(new Error('Send failed'));

      const result = await docker.sendCommand('test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Send failed');
    });
  });

  describe('restart', () => {
    test('restarts container successfully', async () => {
      mockContainer.restart.mockResolvedValue();

      const result = await docker.restart();
      expect(result.success).toBe(true);
      expect(mockContainer.restart).toHaveBeenCalled();
    });

    test('handles restart failure', async () => {
      mockContainer.restart.mockRejectedValue(new Error('Restart failed'));

      const result = await docker.restart();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Restart failed');
    });
  });

  describe('stop', () => {
    test('stops container successfully', async () => {
      mockContainer.stop.mockResolvedValue();

      const result = await docker.stop();
      expect(result.success).toBe(true);
      expect(mockContainer.stop).toHaveBeenCalled();
    });

    test('handles stop failure', async () => {
      mockContainer.stop.mockRejectedValue(new Error('Stop failed'));

      const result = await docker.stop();
      expect(result.success).toBe(false);
    });
  });

  describe('start', () => {
    test('starts container successfully', async () => {
      mockContainer.start.mockResolvedValue();

      const result = await docker.start();
      expect(result.success).toBe(true);
      expect(mockContainer.start).toHaveBeenCalled();
    });

    test('handles start failure', async () => {
      mockContainer.start.mockRejectedValue(new Error('Start failed'));

      const result = await docker.start();
      expect(result.success).toBe(false);
    });
  });

  describe('getLogs', () => {
    test('gets container logs', async () => {
      const mockLogStream = { pipe: jest.fn() };
      mockContainer.logs.mockResolvedValue(mockLogStream);

      const stream = await docker.getLogs({ tail: 50 });
      expect(stream).toBe(mockLogStream);
      expect(mockContainer.logs).toHaveBeenCalledWith({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 50,
        timestamps: true
      });
    });

    test('uses default tail value', async () => {
      const mockLogStream = { pipe: jest.fn() };
      mockContainer.logs.mockResolvedValue(mockLogStream);

      await docker.getLogs();
      expect(mockContainer.logs).toHaveBeenCalledWith(
        expect.objectContaining({ tail: 100 })
      );
    });
  });

  describe('getArchive', () => {
    test('gets archive from container', async () => {
      const mockArchive = { pipe: jest.fn() };
      mockContainer.getArchive.mockResolvedValue(mockArchive);

      const archive = await docker.getArchive('/opt/hytale/test');
      expect(archive).toBe(mockArchive);
      expect(mockContainer.getArchive).toHaveBeenCalledWith({ path: '/opt/hytale/test' });
    });
  });

  describe('putArchive', () => {
    test('puts archive to container', async () => {
      mockContainer.putArchive.mockResolvedValue();
      const mockStream = { pipe: jest.fn() };

      await docker.putArchive(mockStream, { path: '/opt/hytale' });
      expect(mockContainer.putArchive).toHaveBeenCalledWith(mockStream, { path: '/opt/hytale' });
    });
  });
});
