const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const { generateToken } = require('../src/middleware/auth');

// Mock files service
jest.mock('../src/services/files', () => ({
  upload: jest.fn(),
  download: jest.fn()
}));

const files = require('../src/services/files');
const apiRoutes = require('../src/routes/api');

// Create test app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', apiRoutes);

describe('API Routes', () => {
  const validToken = generateToken('admin');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    test('requires authentication for upload', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .send({});

      expect(res.status).toBe(401);
    });

    test('requires authentication for download', async () => {
      const res = await request(app)
        .get('/api/files/download')
        .query({ path: '/test' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/files/upload', () => {
    test('returns 400 when no file provided', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No file provided');
    });

    test('uploads file successfully', async () => {
      files.upload.mockResolvedValue({ success: true });

      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('test content'), 'test.txt')
        .field('targetDir', '/config');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(files.upload).toHaveBeenCalledWith(
        '/config',
        'test.txt',
        expect.any(Buffer)
      );
    });

    test('uses root directory when no targetDir', async () => {
      files.upload.mockResolvedValue({ success: true });

      await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(files.upload).toHaveBeenCalledWith(
        '/',
        'test.txt',
        expect.any(Buffer)
      );
    });

    test('handles upload error', async () => {
      files.upload.mockRejectedValue(new Error('Upload failed'));

      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Upload failed');
    });
  });

  describe('GET /api/files/download', () => {
    test('returns 400 when no path provided', async () => {
      const res = await request(app)
        .get('/api/files/download')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Path required');
    });

    test('returns 404 when file not found', async () => {
      files.download.mockResolvedValue({ success: false, error: 'Not found' });

      const res = await request(app)
        .get('/api/files/download')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ path: '/nonexistent' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('downloads file successfully', async () => {
      const { Readable } = require('stream');
      const mockStream = new Readable({
        read() {
          this.push('file content');
          this.push(null);
        }
      });

      files.download.mockResolvedValue({
        success: true,
        fileName: 'test',
        stream: mockStream
      });

      const res = await request(app)
        .get('/api/files/download')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ path: '/test.txt' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/x-tar');
      expect(res.headers['content-disposition']).toContain('test.tar');
    });

    test('handles download error', async () => {
      files.download.mockRejectedValue(new Error('Download failed'));

      const res = await request(app)
        .get('/api/files/download')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ path: '/test.txt' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Download failed');
    });
  });
});
