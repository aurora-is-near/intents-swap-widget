const React = require('react');

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

module.exports = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (prop === '__esModule') {
        return true;
      }

      if (prop === 'default') {
        return createMockIcon('MaterialIcon');
      }

      return createMockIcon(`MaterialIcon_${String(prop)}`);
    },
  },
);
