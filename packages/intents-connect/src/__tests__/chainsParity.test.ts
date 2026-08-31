import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EVM_CHAIN_IDS } from '@/chains';

/**
 * `EVM_CHAIN_IDS` deliberately mirrors the widget's `EVM_CHAIN_IDS_MAP`
 * (this package is dependency-free, so it cannot import it). Each copy is
 * self-consistent, so nothing else catches drift: a chain added on only one
 * side silently degrades `resume()` from driving the wallet transfer to
 * merely surfacing the deposit address. This test is the tripwire.
 *
 * The widget source is read as text rather than imported: importing it would
 * pull the widget's path aliases (and its dependency graph) into this
 * package's typecheck. Located by walking up from the cwd, so the test works
 * from the package dir and from the monorepo root alike.
 */
const findWidgetChainsSource = (): string => {
  const relative = 'packages/intents-swap-widget/src/constants/chains.ts';

  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    const candidate = join(dir, relative);

    if (existsSync(candidate)) {
      return candidate;
    }

    if (dirname(dir) === dir) {
      throw new Error(`${relative} not found above ${process.cwd()}`);
    }
  }
};

const parseWidgetEvmChainIds = (source: string): Record<string, number> => {
  const [, body] = source.match(/EVM_CHAIN_IDS_MAP[^=]*=\s*\{([^}]*)\}/) ?? [];

  const entries = [...(body ?? '').matchAll(/(\w+):\s*(\d+)/g)].map(
    ([, chain, id]) => [chain, Number(id)] as const,
  );

  return Object.fromEntries(entries);
};

describe('EVM_CHAIN_IDS parity with the widget', () => {
  it('carries exactly the pairs of the widget EVM_CHAIN_IDS_MAP', () => {
    const widgetMap = parseWidgetEvmChainIds(
      readFileSync(findWidgetChainsSource(), 'utf8'),
    );

    // An empty parse means the widget file moved or changed shape — that must
    // fail loudly, not pass as "both sides empty".
    expect(Object.keys(widgetMap).length).toBeGreaterThan(0);

    expect({ ...EVM_CHAIN_IDS }).toEqual(widgetMap);
  });
});
