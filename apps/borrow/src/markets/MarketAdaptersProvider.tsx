import { createContext, type ReactNode, useContext } from 'react';

import type { LendingMarketAdapter } from './types';

const MarketAdaptersContext = createContext<
  readonly LendingMarketAdapter[] | null
>(null);

type MarketAdaptersProviderProps = {
  /** The lending protocols the app shows; tests pass fakes. */
  adapters: readonly LendingMarketAdapter[];
  children: ReactNode;
};

/**
 * The adapters screens read markets through. Screens use the hooks and
 * `markets/types.ts`, never a protocol's own module.
 */
export function MarketAdaptersProvider({
  adapters,
  children,
}: MarketAdaptersProviderProps) {
  return (
    <MarketAdaptersContext.Provider value={adapters}>
      {children}
    </MarketAdaptersContext.Provider>
  );
}

/** The adapter list. Throws outside `MarketAdaptersProvider`. */
export const useMarketAdapters = (): readonly LendingMarketAdapter[] => {
  const adapters = useContext(MarketAdaptersContext);

  if (!adapters) {
    throw new Error(
      'useMarketAdapters must be used inside MarketAdaptersProvider',
    );
  }

  return adapters;
};
