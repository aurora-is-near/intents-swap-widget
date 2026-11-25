import { createContext, type ReactNode, useContext } from 'react';

import type { PositionsReader } from './types';

const PositionsReaderContext = createContext<PositionsReader | null>(null);

type PositionsReaderProviderProps = {
  /** Where positions are read from; tests pass fakes. `null` reads nothing. */
  reader: PositionsReader | null;
  children: ReactNode;
};

/**
 * The reader the positions hooks read through. Without one, nothing is read:
 * the hooks report no owners and no positions.
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

/** The reader, or `null` outside `PositionsReaderProvider`. */
export const usePositionsReader = (): PositionsReader | null =>
  useContext(PositionsReaderContext);
