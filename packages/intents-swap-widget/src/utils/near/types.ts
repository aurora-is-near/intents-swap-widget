import type { BlockId, Finality } from 'near-api-js/lib/providers/provider';

export type OptionalBlockReference = {
  blockId?: BlockId;
  finality?: Finality;
};

export type QueryArgs = {
  contractId: string;
  methodName: string;
  args: Record<string, unknown>;
  blockId?: BlockId;
  finality?: Finality;
};
