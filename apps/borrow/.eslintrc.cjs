/**
 * As packages/ui-kit: jsx-a11y's recommended rules as errors, and a browser
 * env. The shared config only turns them on when the repo root lists React
 * (it doesn't).
 */
module.exports = {
  root: true,
  extends: ['../../.eslintrc.json', 'plugin:jsx-a11y/recommended'],
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
    'jsx-a11y/label-has-for': 'off',
  },
};
