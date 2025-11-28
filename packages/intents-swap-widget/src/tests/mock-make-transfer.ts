import { jest } from '@jest/globals';

import type { MakeTransferArgs, TransferResult } from '../types/transfer';

const TX_HASH = 'transaction-hash-mock';

export const mockMakeTransfer: jest.Mock<
  (args: MakeTransferArgs) => Promise<TransferResult>
> = jest.fn(
  async (_args: MakeTransferArgs) =>
    ({
      hash: TX_HASH,
      intent: 'mock-intent-id',
      transactionLink: `https://explorer.mock/tx/${TX_HASH}`,
    }) satisfies TransferResult,
);
