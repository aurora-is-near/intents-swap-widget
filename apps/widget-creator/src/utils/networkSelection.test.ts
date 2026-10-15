import { describe, expect, it } from 'vitest';

import { getAllowedChainsList } from './networkSelection';

describe('getAllowedChainsList', () => {
  it('saves no list when every available network is selected', () => {
    expect(
      getAllowedChainsList(['eth', 'base', 'hood'], ['eth', 'base', 'hood']),
    ).toBeUndefined();
  });

  it('ignores selected networks the API key cannot use', () => {
    // e.g. a restricted chain left selected from the default state
    expect(
      getAllowedChainsList(['eth', 'base', 'qtc'], ['eth', 'base']),
    ).toBeUndefined();
  });

  it('saves the selection when some available network is deselected', () => {
    expect(
      getAllowedChainsList(['eth', 'base'], ['eth', 'base', 'hood']),
    ).toEqual(['eth', 'base']);
  });

  it('saves an empty list when nothing is selected', () => {
    expect(getAllowedChainsList([], ['eth', 'base'])).toEqual([]);
  });
});
