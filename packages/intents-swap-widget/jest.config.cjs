const nodeModulesToTransform = [
  'uuid',
  'change-case',
  'copy-text-to-clipboard',
  'react-error-boundary',
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
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: {
            react: { runtime: 'automatic' },
            optimizer: {
              globals: {
                vars: {
                  'import.meta.env.SWAP_WIDGET_VERSION': 'v1',
                },
              },
            },
          },
        },
      },
    ],
    '.+\\.(png|jpg)$': 'jest-transform-stub',
    '^.+\\.svg$': 'jest-transformer-svg',
  },
  transformIgnorePatterns: [`node_modules/(?!(${nodeModulesToTransform})/)`],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
