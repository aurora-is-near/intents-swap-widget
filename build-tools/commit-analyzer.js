/* eslint-disable no-console */
const commitAnalyzer = require('@semantic-release/commit-analyzer');
const { spawn } = require('child_process');
const { minimatch } = require('minimatch');

const getFileDiff = async (commitHash) =>
  new Promise((resolve, reject) => {
    const child = spawn('git', [
      'diff-tree',
      '--name-only',
      '--no-commit-id',
      '-r',
      commitHash,
    ]);

    const paths = [];

    child.stdout.on('data', (data) => {
      paths.push(...data.toString().split('\n').filter(Boolean));
    });

    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    child.on('close', (code) => {
      if (code) {
        reject(new Error('Git diff failed'));
      } else {
        resolve(paths);
      }
    });
  });

/**
 * Analyze commits, ignoring those that only affect /apps/**.
 *
 * This is so that we do not generate a new package release any time one of the
 * apps changes.
 */
const analyzeCommits = async (pluginConfig, context) => {
  const { commits } = context;

  const filteredCommits = [];

  await Promise.all(
    commits.map(async (c) => {
      const diff = await getFileDiff(c.commit.long);

      // Check if this commit only touched files under /apps/**
      const onlyAppsChanged = diff.every((p) =>
        minimatch(p, 'apps/**', { dot: true }),
      );

      // Only keep commits that affect something outside /apps
      if (!onlyAppsChanged) {
        filteredCommits.push(c);
      }
    }),
  );

  if (!filteredCommits.length) {
    console.log('No relevant commits in /packages — skipping release');

    return null;
  }

  // Delegate to official analyzer for semantic meaning
  return commitAnalyzer.analyzeCommits(pluginConfig, {
    ...context,
    commits: filteredCommits,
  });
};

/**
 * No-op for generateNotes — handled by semantic-release core
 */
const generateNotes = async () => {};

module.exports = {
  analyzeCommits,
  generateNotes,
};
