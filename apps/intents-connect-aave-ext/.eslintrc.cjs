/**
 * jsx-a11y's recommended rules, as errors. The shared config only turns
 * them on when the repo root lists React (it doesn't), so they're turned on
 * here.
 */
module.exports = {
  root: true,
  extends: ['../../.eslintrc.json', 'plugin:jsx-a11y/recommended'],
  // Browser code, tests included (jsdom). The shared config sets only node
  // and test globals, for the same reason as above.
  env: { browser: true },
  plugins: ['jsx-a11y'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  rules: {
    // Off in the shared config's React rules too.
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/media-has-caption': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
    // Deprecated (it wants nesting and an id at once); its successor is the
    // rule above.
    'jsx-a11y/label-has-for': 'off',
  },
};
