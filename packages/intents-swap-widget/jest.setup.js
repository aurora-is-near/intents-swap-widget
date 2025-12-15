const React = require('react');

const {
  headlessUITransitionMock,
} = require('./src/tests/mock-headless-ui-transition');

jest.mock('@headlessui/react', () => {
  return headlessUITransitionMock(jest.requireActual('@headlessui/react'));
});

const createMockIcon = (displayName) => {
  const MockIcon = ({ size, className }) =>
    React.createElement('svg', {
      'data-testid': displayName,
      width: size,
      height: size,
      className,
    });

  MockIcon.displayName = displayName;

  return MockIcon;
};
