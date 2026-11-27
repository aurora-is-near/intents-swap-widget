import { useState } from 'react';

import { useOwnerAccounts } from './useOwnerAccounts';
import { usePositions } from './usePositions';

/**
 * The My positions tab's count badge: the number of listed loans, `undefined`
 * (no badge) without a wallet or before the first read. While a read is
 * pending or failing the last known count of the same accounts stays: a
 * failed read never shows 0. Another wallet starts without a badge.
 */
export const usePositionsCount = (): number | undefined => {
  const { status, positions, partial } = usePositions();
  const owners = useOwnerAccounts().owners.join(',');
  const [last, setLast] = useState<{ owners: string; count?: number }>({
    owners,
  });

  // The kept count belongs to the accounts it was read for.
  let count = last.owners === owners ? last.count : undefined;

  if (status === 'idle') {
    count = undefined;
  } else if (
    status === 'success' &&
    (!partial || positions.length > (count ?? 0))
  ) {
    count = positions.length;
  }

  // React's way to keep a value from earlier renders: set state while
  // rendering when it changed, rather than write a ref.
  if (count !== last.count || owners !== last.owners) {
    setLast({ owners, count });
  }

  return count;
};
