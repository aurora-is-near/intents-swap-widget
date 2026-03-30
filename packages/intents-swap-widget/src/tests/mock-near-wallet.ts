import { jest } from '@jest/globals';
import type { FinalExecutionOutcome } from '@near-js/types';
import type {
  NearSignAndSendTransactionsParams,
  NearSignedMessage,
  NearSignMessageParams,
  NearWalletBase,
} from '@/types/near';

const mockSignedMessage: NearSignedMessage = {
  accountId: 'test-account.near',
  publicKey: 'ed25519:3xZ...',
  signature: 'base64signature...',
};

const mockFinalExecutionOutcome: FinalExecutionOutcome = {
  status: { SuccessValue: '' },
  final_execution_status: 'FINAL',
  transaction: {
    hash: '11111',
    public_key: 'ed25519:3xZ...',
    signature: 'sig',
    nonce: 1,
    receiver_id: 'receiver.near',
    signer_id: 'test-account.near',
    actions: [],
  },
  transaction_outcome: {
    id: '11111',
    outcome: {
      logs: [],
      receipt_ids: [],
      gas_burnt: 0,
      tokens_burnt: '0',
      executor_id: 'test-account.near',
      status: { SuccessValue: '' },
    },
  },
  receipts_outcome: [],
};

export const mockNearWallet = (): jest.Mocked<NearWalletBase> => ({
  signMessage: jest.fn(
    async (_params: NearSignMessageParams) => mockSignedMessage,
  ),
  signAndSendTransactions: jest.fn(
    async (_params: NearSignAndSendTransactionsParams) => [
      mockFinalExecutionOutcome,
    ],
  ),
});
