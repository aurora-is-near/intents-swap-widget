import { describe, expect, it } from 'vitest';

import { formatAddress } from '../formatAddress';

describe('formatAddress', () => {
  it('keeps the first 6 and last 4 characters of an EVM address', () => {
    expect(formatAddress('0x7a3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21')).toBe(
      '0x7a3f…9c21',
    );
  });

  it('shortens a Solana address the same way', () => {
    expect(formatAddress('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV')).toBe(
      '7EcDhS…FLtV',
    );
  });

  it('shortens a Stellar key the same way', () => {
    expect(
      formatAddress('GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG'),
    ).toBe('GCKFBE…MTGG');
  });

  it('keeps a named NEAR account whole', () => {
    expect(formatAddress('alice.near')).toBe('alice.near');
    expect(formatAddress('maksim-borrow-app.near')).toBe(
      'maksim-borrow-app.near',
    );
  });

  it('keeps the start and suffix of a long named NEAR account', () => {
    expect(formatAddress('a-very-long-account-name.near')).toBe(
      'a-very-long-acco….near',
    );
  });

  it('shortens an implicit NEAR account like a key', () => {
    expect(
      formatAddress(
        '98793cd91a3f870fb126f66285808c7e094afcfc4eda8a970f6648cdf0dbd6de',
      ),
    ).toBe('98793c…d6de');
  });

  it('returns an address too short to shorten unchanged', () => {
    expect(formatAddress('0x7a3f9c21')).toBe('0x7a3f9c21');
    expect(formatAddress('0x7a3f…9c21')).toBe('0x7a3f…9c21');
    expect(formatAddress('')).toBe('');
  });
});
