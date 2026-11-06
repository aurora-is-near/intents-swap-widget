import type { DetectedWallet } from '@aurora-is-near/intents-connect-wallet/detect';
import { describe, expect, it } from 'vitest';

import { transferSigner } from './signer';

const wallet = (id: string, family: string, address?: string): DetectedWallet =>
  ({ id, name: id, family, address }) as DetectedWallet;

const metaMask = wallet('MetaMask', 'evm', '0xAAA');
const rabby = wallet('Rabby', 'evm', '0xBBB');
const phantom = wallet('Phantom', 'sol');
const solflare = wallet('Solflare', 'sol', 'So1');
const tronLink = wallet('TronLink', 'tron');

describe('transferSigner', () => {
  it("signs EVM networks with the dApp's wallet", () => {
    expect(
      transferSigner('evm', {
        wallets: [rabby, metaMask],
        active: { family: 'sol', address: 'So1' },
        dappAccount: '0xaaa',
      }),
    ).toEqual({ kind: 'ready', wallet: metaMask });
    expect(
      transferSigner('evm', {
        wallets: [rabby, metaMask],
        active: { family: 'evm', address: '0xaaa' },
        dappAccount: '0xAAA',
      }),
    ).toEqual({ kind: 'active' });
  });

  it("falls back to the family's active, then connected, then any wallet", () => {
    const wallets = [metaMask, phantom, solflare, tronLink];

    expect(
      transferSigner('sol', {
        wallets,
        active: { family: 'sol', address: 'Ph1' },
      }),
    ).toEqual({ kind: 'active' });
    expect(transferSigner('sol', { wallets, active: null })).toEqual({
      kind: 'ready',
      wallet: solflare,
    });
    expect(transferSigner('tron', { wallets, active: null })).toEqual({
      kind: 'choose',
      wallets: [tronLink],
    });
    expect(transferSigner('near', { wallets, active: null })).toEqual({
      kind: 'none',
    });
  });

  it("uses another EVM wallet when the dApp's isn't detected", () => {
    expect(
      transferSigner('evm', {
        wallets: [rabby],
        active: null,
        dappAccount: '0xAAA',
      }),
    ).toEqual({ kind: 'ready', wallet: rabby });
  });
});
