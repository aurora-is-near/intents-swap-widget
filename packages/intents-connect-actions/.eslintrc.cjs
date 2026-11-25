/**
 * The repo's shared config with type-aware rules for this package. No React
 * and no browser globals: the resolver is plain data in, data out, and its
 * tests run in node.
 */
module.exports = {
  root: true,
  extends: ['../../.eslintrc.json'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
};
