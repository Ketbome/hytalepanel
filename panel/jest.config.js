module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/socket/handlers.js' // Complex to unit test, depends on Socket.IO internals
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    // Per-file thresholds for files we CAN test well
    './src/config/index.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/middleware/auth.js': {
      branches: 90,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/routes/api.js': {
      branches: 80,
      functions: 100,
      lines: 90,
      statements: 90
    },
    './src/routes/auth.js': {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85
    },
    './src/services/docker.js': {
      branches: 50,
      functions: 90,
      lines: 90,
      statements: 85
    },
    './src/services/downloader.js': {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95
    }
  },
  verbose: true
};
