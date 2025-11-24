const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  resetMocks: true,
  preset: 'jest-puppeteer',
  testEnvironment: 'jest-environment-puppeteer',
  testMatch: ['**/?(*.)+(visual.spec|visual.test).(js|ts|tsx)'],
  transform: {
    ...baseConfig.transform,
    'node_modules/@puppeteer/browsers/.+\\.ts?$': 'ts-jest',
  },
  coverageReporters: ['html', 'text'],
  reporters: [
    'default',
    'jest-image-snapshot/src/outdated-snapshot-reporter.js',
  ],
};
