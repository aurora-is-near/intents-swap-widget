import { GetExecutionStatusResponse } from '@defuse-protocol/one-click-sdk-typescript';
import type { QuoteResponse } from '@defuse-protocol/one-click-sdk-typescript';

export const getMockPendingDepositStatus = (
  quoteMock: QuoteResponse,
): GetExecutionStatusResponse => ({
  status: GetExecutionStatusResponse.status.PENDING_DEPOSIT,
  updatedAt: '2026-02-27T11:58:46.024Z',
  quoteResponse: quoteMock,
  swapDetails: {
    intentHashes: [],
    nearTxHashes: [],
    originChainTxHashes: [],
    destinationChainTxHashes: [],
  },
});
