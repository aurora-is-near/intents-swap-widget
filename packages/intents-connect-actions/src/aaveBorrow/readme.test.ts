import { describe, expect, it } from 'vitest';

import { loadFixtures, readActionFile } from '../tests/actionHarness';

/**
 * The action README's example is copied from a fixture: keep the two equal,
 * so the README never shows a body the action does not produce.
 */

const ACTION = 'aave-v3-borrow-v1';
const FIXTURE = 'base_bridge_in_eth.json';

const readme = readActionFile(ACTION, 'README.md');

/** The JSON code blocks of the README's `## Example` section, parsed. */
const exampleBlocks = (): unknown[] => {
  const section = /^## Example\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(
    readme,
  )?.[1];

  if (section === undefined) {
    throw new Error('README.md has no "## Example" section');
  }

  return [...section.matchAll(/^```json\n([\s\S]*?)^```$/gm)].map(
    ([, body]): unknown => JSON.parse(body ?? ''),
  );
};

describe('aave-v3-borrow README', () => {
  it(`shows ${FIXTURE}'s resolve request and execution`, () => {
    const entry = loadFixtures(ACTION).find(({ name }) => name === FIXTURE);

    expect(entry?.fixture.expected).toBeDefined();
    expect(readme).toContain(`(tests/${FIXTURE})`);
    expect(exampleBlocks()).toEqual([
      { version: 1, inputs: entry?.fixture.input },
      entry?.fixture.expected?.execution,
    ]);
  });

  it.each([
    'POST /api/v1/executions/{wallet}`',
    'POST /api/v1/executions/{wallet}/steps`',
  ])('names the %s endpoint', (endpoint) => {
    expect(readme).toContain(endpoint);
  });
});
