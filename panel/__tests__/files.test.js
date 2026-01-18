// Test pure functions from files service

const path = require('path');

// Mock docker service
jest.mock('../src/services/docker', () => ({
  execCommand: jest.fn(),
  getArchive: jest.fn(),
  putArchive: jest.fn()
}));

const docker = require('../src/services/docker');
const files = require('../src/services/files');
const config = require('../src/config');

describe('Files Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizePath', () => {
    test('blocks path traversal with ../', () => {
      expect(() => files.sanitizePath('../../../etc/passwd')).toThrow('Path traversal');
    });

    test('blocks path traversal with encoded chars', () => {
      expect(() => files.sanitizePath('..\\..\\etc\\passwd')).toThrow('Path traversal');
    });

    test('blocks path traversal with mixed separators', () => {
      expect(() => files.sanitizePath('..\\../etc/passwd')).toThrow('Path traversal');
    });
  });

  describe('isAllowedUpload', () => {
    test('allows .jar files', () => {
      expect(files.isAllowedUpload('plugin.jar')).toBe(true);
    });

    test('allows .zip files', () => {
      expect(files.isAllowedUpload('backup.zip')).toBe(true);
    });

    test('allows .json files', () => {
      expect(files.isAllowedUpload('config.json')).toBe(true);
    });

    test('allows .yaml files', () => {
      expect(files.isAllowedUpload('config.yaml')).toBe(true);
      expect(files.isAllowedUpload('config.yml')).toBe(true);
    });

    test('rejects .exe files', () => {
      expect(files.isAllowedUpload('virus.exe')).toBe(false);
    });

    test('rejects .sh files', () => {
      expect(files.isAllowedUpload('script.sh')).toBe(false);
    });

    test('handles case insensitivity', () => {
      expect(files.isAllowedUpload('CONFIG.JSON')).toBe(true);
      expect(files.isAllowedUpload('Plugin.JAR')).toBe(true);
    });
  });

  describe('isEditable', () => {
    test('allows .json files', () => {
      expect(files.isEditable('config.json')).toBe(true);
    });

    test('allows .yaml files', () => {
      expect(files.isEditable('config.yaml')).toBe(true);
      expect(files.isEditable('config.yml')).toBe(true);
    });

    test('allows .txt files', () => {
      expect(files.isEditable('notes.txt')).toBe(true);
    });

    test('allows .properties files', () => {
      expect(files.isEditable('server.properties')).toBe(true);
    });

    test('rejects .jar files', () => {
      expect(files.isEditable('plugin.jar')).toBe(false);
    });

    test('rejects .zip files', () => {
      expect(files.isEditable('backup.zip')).toBe(false);
    });
  });

  describe('getFileIcon', () => {
    test('returns folder for directories', () => {
      expect(files.getFileIcon('mydir', true)).toBe('folder');
    });

    test('returns java for .jar files', () => {
      expect(files.getFileIcon('plugin.jar', false)).toBe('java');
    });

    test('returns archive for .zip files', () => {
      expect(files.getFileIcon('backup.zip', false)).toBe('archive');
    });

    test('returns json for .json files', () => {
      expect(files.getFileIcon('config.json', false)).toBe('json');
    });

    test('returns yaml for .yaml files', () => {
      expect(files.getFileIcon('config.yaml', false)).toBe('yaml');
      expect(files.getFileIcon('config.yml', false)).toBe('yaml');
    });

    test('returns config for config files', () => {
      expect(files.getFileIcon('server.properties', false)).toBe('config');
      expect(files.getFileIcon('settings.cfg', false)).toBe('config');
    });

    test('returns text for .txt files', () => {
      expect(files.getFileIcon('notes.txt', false)).toBe('text');
    });

    test('returns log for .log files', () => {
      expect(files.getFileIcon('server.log', false)).toBe('log');
    });

    test('returns image for image files', () => {
      expect(files.getFileIcon('icon.png', false)).toBe('image');
    });

    test('returns file for unknown extensions', () => {
      expect(files.getFileIcon('unknown.xyz', false)).toBe('file');
    });
  });

  describe('getRelativePath', () => {
    test('removes base path', () => {
      const fullPath = config.files.basePath + '/config/test.json';
      expect(files.getRelativePath(fullPath)).toBe('/config/test.json');
    });

    test('returns / for base path', () => {
      expect(files.getRelativePath(config.files.basePath)).toBe('/');
    });
  });

  describe('checkServerFiles', () => {
    test('returns ready true when both files exist', async () => {
      docker.execCommand.mockResolvedValue('/opt/hytale/HytaleServer.jar\n/opt/hytale/Assets.zip');

      const result = await files.checkServerFiles();

      expect(result.hasJar).toBe(true);
      expect(result.hasAssets).toBe(true);
      expect(result.ready).toBe(true);
    });

    test('returns ready false when files missing', async () => {
      docker.execCommand.mockResolvedValue('NO_FILES');

      const result = await files.checkServerFiles();

      expect(result.hasJar).toBe(false);
      expect(result.hasAssets).toBe(false);
      expect(result.ready).toBe(false);
    });

    test('handles errors gracefully', async () => {
      docker.execCommand.mockRejectedValue(new Error('Container error'));

      const result = await files.checkServerFiles();

      expect(result.ready).toBe(false);
    });
  });

  describe('checkAuth', () => {
    test('returns true when credentials exist with access_token', async () => {
      docker.execCommand.mockResolvedValue('{"access_token": "abc123"}');

      const result = await files.checkAuth();

      expect(result).toBe(true);
    });

    test('returns false when no credentials file', async () => {
      docker.execCommand.mockResolvedValue('NO_AUTH');

      const result = await files.checkAuth();

      expect(result).toBe(false);
    });

    test('returns false on error', async () => {
      docker.execCommand.mockRejectedValue(new Error('Container error'));

      const result = await files.checkAuth();

      expect(result).toBe(false);
    });
  });

  describe('wipeData', () => {
    test('returns success true on completion', async () => {
      docker.execCommand.mockResolvedValue('');

      const result = await files.wipeData();

      expect(result.success).toBe(true);
    });

    test('returns success false on error', async () => {
      docker.execCommand.mockRejectedValue(new Error('Permission denied'));

      const result = await files.wipeData();

      expect(result.success).toBe(false);
    });
  });
});
