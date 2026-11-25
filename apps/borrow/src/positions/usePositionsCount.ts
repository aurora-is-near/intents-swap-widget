import { useState } from 'react';

import { usePositions } from './usePositions';

type KnownCount = {
  /** The owners it was counted for. */
  owners: string;
  count: number;
};

/**
 * The My positions badge: the number of positions once every read that
 * decides which positions are listed has succeeded. A failed market-data read
 * (`market-risk`) only leaves a figure out, never a position, so it does not
 * hold the count back. While a listing read fails, or a refetch is under way, it keeps the last
 * count known for the same accounts, so an error never drops it to 0. Before
 * any count is known, it is what has loaded so far.
 */
export const usePositionsCount = (): number => {
  const { owners, count, errors, isLoading } = usePositions();
  const [known, setKnown] = useState<KnownCount>();
  const key = owners.join(',');
  const settled =
    !isLoading && errors.every(({ read }) => read === 'market-risk');

  if (settled && (known?.owners !== key || known.count !== count)) {
    setKnown({ owners: key, count });
  }

  if (settled || known?.owners !== key) {
    return count;
  }

  return known.count;
};
