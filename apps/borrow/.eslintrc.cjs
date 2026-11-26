const fs = require('node:fs');
const path = require('node:path');

/**
 * Relative imports stay within one boundary folder of src/: a top-level
 * folder, or one domain under src/domains/ (each domain is its own). Anything
 * else (src/ root-level files, other folders, other domains) is imported as
 * `@/…`, and nothing imports its own folder as `@/…`. A file `depth` folders
 * inside its boundary leaves it with `depth` `../`, so one override per
 * boundary and depth forbids exactly that, and `@/<boundary>`. Root-level
 * files import everything as `@/…`.
 */
const MAX_DEPTH = 6;
const SRC = path.join(__dirname, 'src');
const DOMAINS = 'domains';

const subfolders = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

const BOUNDARIES = subfolders(SRC).flatMap((folder) =>
  folder === DOMAINS
    ? subfolders(path.join(SRC, DOMAINS)).map((domain) => `${DOMAINS}/${domain}`)
    : [folder],
);

const restrict = (group, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group, message }] }],
});

const importBoundaryOverrides = [
  {
    files: ['src/*.ts', 'src/*.tsx'],
    rules: restrict(
      ['./**', '../**'],
      'Root-level src/ files import other src/ files as `@/…`.',
    ),
  },
  ...BOUNDARIES.flatMap((folder) =>
    Array.from({ length: MAX_DEPTH }, (_, index) => {
      const depth = index + 1;
      const dir = `src/${folder}/${'*/'.repeat(depth - 1)}`;

      return {
        files: [`${dir}*.ts`, `${dir}*.tsx`],
        rules: restrict(
          [`${'../'.repeat(depth)}**`, `@/${folder}`, `@/${folder}/**`],
          `Import across src/ folders as \`@/…\`; within src/${folder}/ use a relative path.`,
        ),
      };
    }),
  ),
];

/**
 * As packages/ui-kit: jsx-a11y's recommended rules as errors, and a browser
 * env. The shared config only turns them on when the repo root lists React
 * (it doesn't).
 */
module.exports = {
  overrides: importBoundaryOverrides,
  root: true,
  extends: ['../../.eslintrc.json', 'plugin:jsx-a11y/recommended'],
  env: { browser: true },
  plugins: ['jsx-a11y', 'perfectionist'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  rules: {
    // Type imports on their own line: `import { b } from 'c'` then
    // `import type { A } from 'c'`, never `import { type A, b } from 'c'`.
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
        // `vi.mock(…, async (importOriginal) => importOriginal<typeof
        // import('…')>())` is how vitest types a partial mock.
        disallowTypeAnnotations: false,
      },
    ],
    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    // Import groups, a blank line between each, every group's type imports
    // right after its value imports (no blank line between the two):
    //   packages, then their types;
    //   `@/…`, then their types;
    //   relative imports, then their types, deepest first and `./` last.
    // Package and `@/` imports keep their order (`unsorted`); relative ones
    // are sorted, which puts `../../` before `../` before `./`. Relative
    // imports stay within one top-level folder of src/ (the overrides above).
    'import/order': 'off',
    'perfectionist/sort-imports': [
      'error',
      {
        type: 'unsorted',
        internalPattern: ['^@/.+'],
        newlinesBetween: 'always',
        customGroups: [
          {
            groupName: 'relative-value',
            type: 'alphabetical',
            anyOf: [
              { selector: 'parent', modifiers: ['value'] },
              { selector: 'sibling', modifiers: ['value'] },
              { selector: 'index', modifiers: ['value'] },
            ],
          },
          {
            groupName: 'relative-type',
            type: 'alphabetical',
            anyOf: [
              { selector: 'parent', modifiers: ['type'] },
              { selector: 'sibling', modifiers: ['type'] },
              { selector: 'index', modifiers: ['type'] },
            ],
          },
        ],
        groups: [
          ['value-builtin', 'value-external'],
          { newlinesBetween: 'never' },
          ['type-builtin', 'type-external'],
          'value-internal',
          { newlinesBetween: 'never' },
          'type-internal',
          'relative-value',
          { newlinesBetween: 'never' },
          'relative-type',
          'unknown',
        ],
      },
    ],
    // Off in the shared config's React rules too.
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/media-has-caption': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
    'jsx-a11y/label-has-for': 'off',
  },
};
