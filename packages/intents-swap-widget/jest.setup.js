const {
  headlessUITransitionMock,
} = require('./src/tests/mock-headless-ui-transition');

jest.mock('@headlessui/react', () => {
  return headlessUITransitionMock(jest.requireActual('@headlessui/react'));
});
