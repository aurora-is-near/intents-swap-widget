import { describe, expect, it } from 'vitest';

import { validateRecipient } from './recipient';

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
