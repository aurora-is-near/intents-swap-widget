const nodeModulesToTransform = [
  'node-fetch',
  'data-uri-to-buffer',
  'fetch-blob',
  'formdata-polyfill',
  'eventemitter3',
  'p-queue',
  'p-timeout',
].join('|');

module.exports = {
  clearMocks: true,
  setupFiles: ['./jest.setup.js'],
  reporters: ['default', 'github-actions'],
  setupFilesAfterEnv: ['./jest.setup.after-env.ts'],
  testEnvironment: 'jsdom',
  testMatch: [
    '**/?(*.)+(spec|test).(js|ts|tsx)',
    '!**/?(*.)+(visual.spec|visual.test).(js|ts|tsx)',
  ],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
    '.+\\.(png|jpg)$': 'jest-transform-stub',
    '^.+\\.svg$': 'jest-transformer-svg',
  },
  transformIgnorePatterns: [`node_modules/(?!(${nodeModulesToTransform})/)`],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
