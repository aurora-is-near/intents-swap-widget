const {
  headlessUITransitionMock,
} = require('./tests/mock-headless-ui-transition');

jest.mock('cryptr', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    encrypt: jest.fn(() => 'encrypted-text'),
    decrypt: jest.fn(() => 'decrypted-text'),
  })),
}));

jest.mock('@headlessui/react', () => {
  return headlessUITransitionMock(jest.requireActual('@headlessui/react'));
});
