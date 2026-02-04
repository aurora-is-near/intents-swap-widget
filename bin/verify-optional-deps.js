/* eslint-disable no-console */
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, relative } = require('path');

const pkgDir = join(__dirname, '../packages/intents-swap-widget');
const srcDir = join(pkgDir, 'src');
const OPTIONAL_PACKAGE_PREFIX = '@reown/appkit';
const ALLOWED_FILE = 'src/appkit.tsx';

const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8'));
const meta = pkg.peerDependenciesMeta || {};

const optionalDeps = Object.keys(meta).filter(
  (dep) => meta[dep].optional && dep.startsWith(OPTIONAL_PACKAGE_PREFIX),
);

if (optionalDeps.length === 0) {
  console.log(
    `No optional ${OPTIONAL_PACKAGE_PREFIX} peer dependencies found.`,
  );
  process.exit(0);
}

const collectFiles = (dir) => {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      return collectFiles(full);
    }

    return /\.[jt]sx?$/.test(entry) ? [full] : [];
  });
};

const violations = collectFiles(srcDir)
  .filter((file) => relative(pkgDir, file) !== ALLOWED_FILE)
  .flatMap((file) => {
    const rel = relative(pkgDir, file);
    const content = readFileSync(file, 'utf-8');

    return optionalDeps
      .filter((dep) => {
        const pattern = new RegExp(
          String.raw`\bfrom\s+['"]${dep}(?:\/[^'"]*)?['"]`,
        );

        return pattern.test(content);
      })
      .map((dep) => ({ file: rel, dep }));
  });

if (violations.length > 0) {
  console.error(
    `Optional ${OPTIONAL_PACKAGE_PREFIX} dependencies must only be imported in ${ALLOWED_FILE}.\n`,
  );

  console.error('Violations:');
  violations.forEach(({ file, dep }) => {
    console.error(`  ${file} imports ${dep}`);
  });

  process.exit(1);
}

console.log(
  `Verified: ${optionalDeps.join(', ')} are only imported in ${ALLOWED_FILE}.`,
);
