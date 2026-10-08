import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { base58, hex } from '@scure/base';

import { getSupportedChains } from '../chains/getSupportedChains';
import { getIntentsAccountId } from './getIntentsAccountId';
import { getQuoteRecipient } from './getQuoteRecipient';
import { getQuoteRefundTo } from './getQuoteRefundTo';
import { getQuoteRefundType } from './getQuoteRefundType';
import { getWebAuthnIntentsAccountId } from './getWebAuthnIntentsAccountId';

// Any 64 bytes work as x‖y here: the ID derivation doesn't check the curve.
const POINT = new Uint8Array(64).map((_, i) => i + 1);
const PUBLIC_KEY = `p256:${base58.encode(POINT)}`;
const ACCOUNT_ID = getWebAuthnIntentsAccountId(PUBLIC_KEY);

const usdcIntents = { isIntent: true, blockchain: 'base' } as const;
const usdcBase = { isIntent: false, blockchain: 'base' } as const;
const auroraEth = { isIntent: false, blockchain: 'aurora' } as const;

describe('passkey (webauthn) accounts', () => {
  it('derive the intents account ID from the P-256 key', () => {
    const expected = `0x${hex.encode(
      keccak256(
        new Uint8Array([...new TextEncoder().encode('p256'), ...POINT]),
      ).slice(-20),
    )}`;

    expect(ACCOUNT_ID).toBe(expected);
    expect(
      getIntentsAccountId({
        walletAddress: ACCOUNT_ID,
        addressType: 'webauthn',
      }),
    ).toBe(expected);
  });

  it('reject malformed account IDs', () => {
    expect(
      getIntentsAccountId({
        walletAddress: 'alice.near',
        addressType: 'webauthn',
      }),
    ).toBeUndefined();
  });

  it('have no wallet chains, although the ID looks like an EVM address', () => {
    expect(
      getSupportedChains({
        walletAddress: ACCOUNT_ID,
        intentsAccountType: 'webauthn',
      }),
    ).toEqual([]);
    expect(getSupportedChains({ walletAddress: ACCOUNT_ID })).toContain('eth');
  });

  it('never use the account ID as an on-chain recipient', () => {
    const args = {
      walletAddress: ACCOUNT_ID,
      targetToken: usdcBase,
      intentsAccountType: 'webauthn',
      defaultRecipient: ACCOUNT_ID,
    } as const;

    expect(getQuoteRecipient(args)).toBeUndefined();
    expect(getQuoteRecipient({ ...args, sendAddress: '0xabc' })).toBe('0xabc');
    // Dry quotes keep the per-chain placeholder.
    expect(getQuoteRecipient({ ...args, isDry: true })).toBe(ACCOUNT_ID);
    // Intents targets resolve to the account itself.
    expect(getQuoteRecipient({ ...args, targetToken: usdcIntents })).toBe(
      ACCOUNT_ID,
    );
  });

  it('refund to the intents account, Aurora targets included', () => {
    [usdcBase, auroraEth].forEach((targetToken) => {
      const args = {
        walletAddress: ACCOUNT_ID,
        sourceToken: usdcIntents,
        targetToken,
        intentsAccountType: 'webauthn',
        supportedChains: [],
      } as const;

      expect(getQuoteRefundTo({ ...args, defaultRefundTo: 'unused' })).toBe(
        ACCOUNT_ID,
      );
      expect(getQuoteRefundType(args)).toBe('INTENTS');
    });
  });
});
