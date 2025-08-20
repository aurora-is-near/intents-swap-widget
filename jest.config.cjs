// jest.config.js
const { createDefaultEsmPreset } = require('ts-jest');

const defaultEsmPreset = createDefaultEsmPreset();

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // [...]
  ...defaultEsmPreset,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
