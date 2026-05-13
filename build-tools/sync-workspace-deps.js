/* eslint-disable no-console */
/**
 * Rewrites inter-package dependency ranges to `^<nextVersion>` across all
 * workspace packages, so that every published package depends on the matching
 * version of its siblings. Invoked from `@semantic-release/exec` during the
 * `prepare` step, *after* every `@semantic-release/npm` plugin has bumped its
 * package's own version.
 *
 * Skips ranges of `*` — those are intentionally kept loose, generally for
 * local development.
 */
const fs = require('fs');
const path = require('path');

const SCOPE_PREFIX = '@aurora-is-near/intents-swap-widget';
const DEP_FIELDS = ['dependencies', 'peerDependencies', 'devDependencies'];

const nextVersion = process.argv[2];

if (!nextVersion) {
  console.error('sync-workspace-deps: missing version argument');
  process.exit(1);
}

const nextRange = `^${nextVersion}`;
const packagesDir = path.join(__dirname, '..', 'packages');

const isLooseRange = (range) => range === '*';

const shouldRewrite = ([name, range]) =>
  name.startsWith(SCOPE_PREFIX) && !isLooseRange(range) && range !== nextRange;

const rewriteField = (pkg, field) => {
  const deps = pkg[field];

  if (!deps) {
    return false;
  }

  const updates = Object.entries(deps).filter(shouldRewrite);

  updates.forEach(([name, range]) => {
    deps[name] = nextRange;
    console.log(`  ${pkg.name}: ${field}.${name} ${range} -> ${nextRange}`);
  });

  return updates.length > 0;
};

const syncPackage = (dir) => {
  const pkgPath = path.join(dir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return;
  }

  const raw = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  const changed = DEP_FIELDS.map((field) => rewriteField(pkg, field)).some(
    Boolean,
  );

  if (changed) {
    const trailingNewline = raw.endsWith('\n') ? '\n' : '';

    fs.writeFileSync(
      pkgPath,
      `${JSON.stringify(pkg, null, 2)}${trailingNewline}`,
    );
  }
};

fs.readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesDir, entry.name))
  .forEach(syncPackage);

console.log(`sync-workspace-deps: aligned to ${nextRange}`);
