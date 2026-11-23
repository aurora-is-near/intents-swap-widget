import {
  isNearImplicitAccount,
  isSameSendAddress,
  normaliseNearImplicitAccount,
} from './isNearImplicitAccount';

const ETH_IMPLICIT = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
const ED25519_IMPLICIT = 'a'.repeat(64);

describe('isNearImplicitAccount', () => {
  it.each([ETH_IMPLICIT, ED25519_IMPLICIT])('accepts %s', (address) => {
    expect(isNearImplicitAccount(address)).toBe(true);
  });

  it.each([
    'alice.near',
    '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    'A'.repeat(64),
    '0x1234',
    '',
    undefined,
  ])('rejects %s', (address) => {
    expect(isNearImplicitAccount(address)).toBe(false);
  });
});

describe('normaliseNearImplicitAccount', () => {
  it('lowercases a checksummed 0x address', () => {
    expect(
      normaliseNearImplicitAccount(
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
      ),
    ).toBe(ETH_IMPLICIT);
  });

  it('lowercases an uppercase ed25519 implicit account', () => {
    expect(normaliseNearImplicitAccount('A'.repeat(64))).toBe(ED25519_IMPLICIT);
  });

  it('leaves named accounts untouched', () => {
    expect(normaliseNearImplicitAccount('Alice.near')).toBe('Alice.near');
  });
});

describe('isSameSendAddress', () => {
  it('matches an implicit account regardless of case', () => {
    expect(
      isSameSendAddress(
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
        ETH_IMPLICIT,
      ),
    ).toBe(true);
  });

  it('keeps named accounts case-sensitive', () => {
    expect(isSameSendAddress('Alice.near', 'alice.near')).toBe(false);
  });

  it('does not match a missing address', () => {
    expect(isSameSendAddress(undefined, ETH_IMPLICIT)).toBe(false);
  });
});
