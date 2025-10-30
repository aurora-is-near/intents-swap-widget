import type { BlockReference } from 'near-api-js/lib/providers/provider';

import type { OptionalBlockReference } from './types';

export const getBlockReference = ({
  blockId,
  finality,
}: OptionalBlockReference): BlockReference => {
  if (blockId != null) {
    return { blockId };
  }

  if (finality != null) {
    return { finality };
  }

  return { finality: 'optimistic' };
};
