/* eslint-disable import/order */

// Mock the network boundary first: it breaks the config ↔ network import cycle.
import '../../../tests/mock-axios-requests';

import bs58 from 'bs58';

import type { StellarNetworkPlugin } from '@/types/connectors';
import type { StellarProvider } from '@/types/providers';

import { IntentSignerStellar } from './stellar';

const ADDRESS = 'GABC';
const SIGNATURE = new Uint8Array([1, 2, 3, 4, 250]);
const PUBLIC_KEY = new Uint8Array([9, 8, 7]);

const plugin = {
  decodePublicKey: () => PUBLIC_KEY,
} as unknown as StellarNetworkPlugin;

const signerWith = (signedMessage: string | Uint8Array) =>
  new IntentSignerStellar(
    { walletAddress: ADDRESS },
    {
      signMessage: async () => ({ signedMessage, signerAddress: ADDRESS }),
    } as unknown as StellarProvider,
    plugin,
  );

describe('IntentSignerStellar', () => {
  it.each([
    ['a base64 string', Buffer.from(SIGNATURE).toString('base64')],
    ['raw bytes', SIGNATURE],
  ])('encodes a signature returned as %s', async (_, signedMessage) => {
    const signed = await signerWith(signedMessage).signIntent({
      standard: 'sep53',
      payload: 'intent',
    });

    expect(signed).toMatchObject({
      standard: 'sep53',
      signature: `ed25519:${bs58.encode(SIGNATURE)}`,
      public_key: `ed25519:${bs58.encode(PUBLIC_KEY)}`,
    });
  });
});
