import { jest } from '@jest/globals';

import type { TronProvider } from '@/types/providers';

const tronAddress = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';

export const mockTronWallet: jest.Mocked<TronProvider> = {
  address: tronAddress,
  request: jest.fn(async () => '0xmock-tron-signature'),
  signMessage: jest.fn(async () => ({
    signature: '0xmock-tron-signature',
    address: tronAddress,
  })),
  signTransaction: jest.fn(
    async (
      tx: Parameters<NonNullable<TronProvider['signTransaction']>>[0],
    ) => ({
      txID: tx?.txID,
      raw_data: tx?.raw_data,
      raw_data_hex: tx?.raw_data_hex,
      signature: ['0xmock-tron-tx-signature'],
    }),
  ),
};
