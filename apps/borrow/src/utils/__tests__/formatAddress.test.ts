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

  it('returns an address too short to shorten unchanged', () => {
    expect(formatAddress('0x7a3f9c21')).toBe('0x7a3f9c21');
    expect(formatAddress('0x7a3f…9c21')).toBe('0x7a3f…9c21');
    expect(formatAddress('')).toBe('');
  });
});
