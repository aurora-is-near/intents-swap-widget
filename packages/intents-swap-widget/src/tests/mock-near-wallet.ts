import { jest } from '@jest/globals';
import type { FinalExecutionOutcome } from '@near-js/types';
import type {
  NearWalletBase,
  SignAndSendTransactionParams,
  SignAndSendTransactionsParams,
  SignedMessage,
  SignMessageParams,
  WalletManifest,
} from '@hot-labs/near-connect';

const mockWalletManifest: WalletManifest = {
  id: 'mock-wallet',
  platform: ['web'],
  name: 'Mock Wallet',
  icon: 'https://example.com/icon.png',
  description: 'A mock wallet for unit testing',
  website: 'https://example.com',
  version: '1.0.0',
  executor: 'injected',
  type: 'injected',
  permissions: {
    storage: true,
    external: ['https://example.com'],
  },
  features: {
    signMessage: true,
    signTransaction: true,
    signAndSendTransaction: true,
    signAndSendTransactions: true,
    signInWithoutAddKey: true,
    mainnet: true,
    testnet: true,
  },
};

type Account = {
  accountId: string;
  publicKey: string;
};

const mockAccount: Account = {
  accountId: 'test-account.near',
  publicKey: 'ed25519:3xZ...',
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

const mockSignedMessage: SignedMessage = {
  accountId: 'test-account.near',
  publicKey: 'ed25519:3xZ...',
  signature: 'base64signature...',
};

export const mockNearWallet = (): jest.Mocked<NearWalletBase> => ({
  manifest: mockWalletManifest,
  signIn: jest.fn(async () => [mockAccount]),
  signOut: jest.fn(async () => undefined),
  getAccounts: jest.fn(async () => [mockAccount]),
  signMessage: jest.fn(async (_params: SignMessageParams) => mockSignedMessage),
  signAndSendTransaction: jest.fn(
    async (_params: SignAndSendTransactionParams) => mockFinalExecutionOutcome,
  ),
  signAndSendTransactions: jest.fn(
    async (_params: SignAndSendTransactionsParams) => [
      mockFinalExecutionOutcome,
    ],
  ),
});
