module.exports = {
  root: true,
  extends: ['../../.eslintrc.json'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
};
