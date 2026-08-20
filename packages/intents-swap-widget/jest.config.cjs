const nodeModulesToTransform = [
  'uuid',
  'change-case',
  'copy-text-to-clipboard',
  'react-error-boundary',
  '@hot-labs',
  '@scure',
  '@noble',
  'omni-bridge-sdk',
  'micro-packed',
  'uint8arrays',
  'multiformats',
  'lit',
  'lit-html',
  'lit-element',
  '@lit',
  '@wagmi',
  '@walletconnect',
  '@defuse-protocol/one-click-sdk-typescript',
].join('|');

module.exports = {
  clearMocks: true,
  setupFiles: ['./jest.setup.js'],
  reporters: ['default', 'github-actions'],
  setupFilesAfterEnv: ['./jest.setup.after-env.ts'],
  testEnvironment: 'jsdom',
  testMatch: [
    '**/?(*.)+(spec|test).(js|ts|tsx)',
    '!**/?(*.)+(visual.spec|visual.test).(ts|tsx)',
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
    '^@material-symbols-svg/react-rounded/(.*)$':
      '<rootDir>/jest-mock-icons.js',
    // reicon-react is ESM-only and its `exports` map offers no `require` or
    // `browser` condition, so jsdom cannot resolve it at all. Stubbed like the
    // other icon packs rather than transformed — tests never assert on icons.
    '^reicon-react(/.*)?$': '<rootDir>/jest-mock-icons.js',
  },
};
