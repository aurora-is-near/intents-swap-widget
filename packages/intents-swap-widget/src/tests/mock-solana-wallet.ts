import { jest } from '@jest/globals';
import { PublicKey } from '@solana/web3.js';

export const mockSolanaWallet: {
  publicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTransaction: () => Promise<any>;
} = {
  publicKey: new PublicKey('0x000000000'),
  signMessage: jest.fn(async () => new Uint8Array()),
  signTransaction: jest.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (): Promise<any> => ({
      signedTransaction: new Uint8Array(),
    }),
  ),
};
