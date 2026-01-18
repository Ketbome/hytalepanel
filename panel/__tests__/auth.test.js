const { 
  verifyToken, 
  generateToken, 
  getToken, 
  requireAuth, 
  socketAuth 
} = require('../src/middleware/auth');

describe('Auth Middleware', () => {
  describe('generateToken / verifyToken', () => {
    test('generates valid JWT that can be verified', () => {
      const token = generateToken('testuser');
      const decoded = verifyToken(token);
      
      expect(token.split('.').length).toBe(3);
      expect(decoded.username).toBe('testuser');
    });

    test('returns null for invalid tokens', () => {
      expect(verifyToken('invalid.token')).toBeNull();
      expect(verifyToken('')).toBeNull();
      expect(verifyToken(null)).toBeNull();
    });
  });

  describe('getToken', () => {
    test('extracts from cookie, header, or returns null', () => {
      expect(getToken({ cookies: { token: 'cookie-token' }, headers: {} })).toBe('cookie-token');
      expect(getToken({ cookies: {}, headers: { authorization: 'Bearer header-token' } })).toBe('header-token');
      expect(getToken({ cookies: {}, headers: {} })).toBeNull();
      expect(getToken({ cookies: {}, headers: { authorization: 'Basic xyz' } })).toBeNull();
    });

    test('prefers cookie over header', () => {
      const req = {
        cookies: { token: 'cookie-token' },
        headers: { authorization: 'Bearer header-token' }
      };
      expect(getToken(req)).toBe('cookie-token');
    });
  });

  describe('requireAuth middleware', () => {
    const mockRes = () => ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    });

    test('returns 401 without valid token', () => {
      const res = mockRes();
      const next = jest.fn();
      
      requireAuth({ cookies: {}, headers: {} }, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();

      requireAuth({ cookies: { token: 'invalid' }, headers: {} }, mockRes(), next);
      expect(next).not.toHaveBeenCalled();
    });

    test('calls next() and sets req.user with valid token', () => {
      const token = generateToken('testuser');
      const req = { cookies: { token }, headers: {} };
      const res = mockRes();
      const next = jest.fn();
      
      requireAuth(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.user.username).toBe('testuser');
    });
  });

  describe('socketAuth middleware', () => {
    test('fails without valid token', () => {
      const next = jest.fn();
      
      socketAuth({ handshake: { auth: {}, headers: {} } }, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('succeeds with valid token and sets socket.user', () => {
      const token = generateToken('testuser');
      const socket = { handshake: { auth: { token }, headers: {} } };
      const next = jest.fn();
      
      socketAuth(socket, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(socket.user.username).toBe('testuser');
    });

    test('extracts token from cookie header', () => {
      const token = generateToken('testuser');
      const socket = { handshake: { auth: {}, headers: { cookie: `token=${token}` } } };
      const next = jest.fn();
      
      socketAuth(socket, next);
      
      expect(socket.user.username).toBe('testuser');
    });
  });
});
