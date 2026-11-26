import { describe, expect, it } from 'vitest';

import { recipientState, validateRecipient } from '../recipient';

const CHECKSUMMED = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('validateRecipient', () => {
  it('accepts a checksummed address', () => {
    expect(validateRecipient(CHECKSUMMED)).toEqual({
      status: 'valid',
      address: CHECKSUMMED,
    });
  });

  it('accepts an all-lowercase address, ignoring surrounding spaces', () => {
    const lower = CHECKSUMMED.toLowerCase();

    expect(validateRecipient(`  ${lower} `)).toEqual({
      status: 'valid',
      address: lower,
    });
  });

  it.each([
    ['an ENS name', 'vitalik.eth'],
    ['a short address', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA9604'],
    ['a wrong checksum', '0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
    ['text', 'not an address'],
  ])('rejects %s', (_, value) => {
    expect(validateRecipient(value)).toEqual({ status: 'invalid' });
  });

  it('treats a blank value as not entered, not invalid', () => {
    expect(validateRecipient('')).toEqual({ status: 'empty' });
    expect(validateRecipient('   ')).toEqual({ status: 'empty' });
  });
});

describe('recipientState', () => {
  const state = (overrides: Partial<Parameters<typeof recipientState>[0]>) =>
    recipientState({
      connected: true,
      walletFamily: 'evm',
      ticked: false,
      value: '',
      ...overrides,
    });

  it('requires a recipient for a connected non-EVM wallet only', () => {
    expect(state({ walletFamily: 'solana' }).required).toBe(true);
    expect(state({ walletFamily: 'solana', connected: false }).required).toBe(
      false,
    );
    expect(state({ walletFamily: null }).required).toBe(false);
    expect(state({ walletFamily: undefined }).required).toBe(false);
  });

  it('sends to the valid address only while enabled', () => {
    expect(state({ ticked: true, value: CHECKSUMMED }).address).toBe(
      CHECKSUMMED,
    );
    expect(
      state({ ticked: false, value: CHECKSUMMED }).address,
    ).toBeUndefined();
    expect(state({ walletFamily: 'solana', value: CHECKSUMMED }).address).toBe(
      CHECKSUMMED,
    );
    expect(state({ ticked: true, value: 'nope' }).address).toBeUndefined();
  });
});
