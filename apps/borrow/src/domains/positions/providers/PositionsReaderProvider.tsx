import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { PositionsReader } from '../types';

const PositionsReaderContext = createContext<PositionsReader | null>(null);

type PositionsReaderProviderProps = {
  /** Where positions are read from; tests pass a fake. */
  reader: PositionsReader;
  children: ReactNode;
};

/**
 * The reader the positions hooks use. Screens use the hooks and
 * `positions/types.ts`, never the vaults.fyi reader itself.
 */
export function PositionsReaderProvider({
  reader,
  children,
}: PositionsReaderProviderProps) {
  return (
    <PositionsReaderContext.Provider value={reader}>
      {children}
    </PositionsReaderContext.Provider>
  );
}

/** The reader. Throws outside `PositionsReaderProvider`. */
export const usePositionsReader = (): PositionsReader => {
  const reader = useContext(PositionsReaderContext);

  if (!reader) {
    throw new Error(
      'usePositionsReader must be used inside PositionsReaderProvider',
    );
  }

  return reader;
};
