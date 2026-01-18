const { 
  verifyToken, 
  generateToken, 
  getToken, 
  requireAuth, 
  socketAuth 
} = require('../src/middleware/auth');

describe('Auth Middleware', () => {
  describe('generateToken', () => {
    test('generates a valid JWT string', () => {
      const token = generateToken('testuser');
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('generates different tokens for different users', () => {
      const token1 = generateToken('user1');
      const token2 = generateToken('user2');
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    test('verifies valid token', () => {
      const token = generateToken('testuser');
      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded.username).toBe('testuser');
    });

    test('returns null for invalid token', () => {
      const decoded = verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });

    test('returns null for empty token', () => {
      expect(verifyToken('')).toBeNull();
      expect(verifyToken(null)).toBeNull();
      expect(verifyToken(undefined)).toBeNull();
    });
  });

  describe('getToken', () => {
    test('extracts token from cookie', () => {
      const req = { cookies: { token: 'cookie-token' }, headers: {} };
      expect(getToken(req)).toBe('cookie-token');
    });

    test('extracts token from Authorization header', () => {
      const req = { cookies: {}, headers: { authorization: 'Bearer header-token' } };
      expect(getToken(req)).toBe('header-token');
    });

    test('prefers cookie over header', () => {
      const req = {
        cookies: { token: 'cookie-token' },
        headers: { authorization: 'Bearer header-token' }
      };
      expect(getToken(req)).toBe('cookie-token');
    });

    test('returns null when no token', () => {
      const req = { cookies: {}, headers: {} };
      expect(getToken(req)).toBeNull();
    });

    test('returns null for malformed Authorization header', () => {
      const req = { cookies: {}, headers: { authorization: 'Basic xyz' } };
      expect(getToken(req)).toBeNull();
    });
  });

  describe('requireAuth', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = { cookies: {}, headers: {} };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    test('returns 401 when no token provided', () => {
      requireAuth(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('returns 401 for invalid token', () => {
      mockReq.cookies.token = 'invalid-token';
      
      requireAuth(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('calls next() with valid token', () => {
      const token = generateToken('testuser');
      mockReq.cookies.token = token;
      
      requireAuth(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.username).toBe('testuser');
    });

    test('works with Authorization header', () => {
      const token = generateToken('testuser');
      mockReq.headers.authorization = `Bearer ${token}`;
      
      requireAuth(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('socketAuth', () => {
    let mockSocket, mockNext;

    beforeEach(() => {
      mockSocket = {
        handshake: {
          auth: {},
          headers: {}
        }
      };
      mockNext = jest.fn();
    });

    test('fails when no token provided', () => {
      socketAuth(mockSocket, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Authentication required');
    });

    test('fails with invalid token', () => {
      mockSocket.handshake.auth.token = 'invalid-token';
      
      socketAuth(mockSocket, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Invalid or expired token');
    });

    test('succeeds with valid token in auth', () => {
      const token = generateToken('testuser');
      mockSocket.handshake.auth.token = token;
      
      socketAuth(mockSocket, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockSocket.user.username).toBe('testuser');
    });

    test('extracts token from cookie header', () => {
      const token = generateToken('testuser');
      mockSocket.handshake.headers.cookie = `token=${token}; other=value`;
      
      socketAuth(mockSocket, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockSocket.user.username).toBe('testuser');
    });

    test('prefers auth token over cookie', () => {
      const authToken = generateToken('authuser');
      const cookieToken = generateToken('cookieuser');
      mockSocket.handshake.auth.token = authToken;
      mockSocket.handshake.headers.cookie = `token=${cookieToken}`;
      
      socketAuth(mockSocket, mockNext);
      
      expect(mockSocket.user.username).toBe('authuser');
    });
  });
});
