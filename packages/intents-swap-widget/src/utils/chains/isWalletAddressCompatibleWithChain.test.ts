import { isWalletAddressCompatibleWithChain } from './isWalletAddressCompatibleWithChain';

describe('isWalletAddressCompatibleWithChain', () => {
  it('accepts an EVM address for EVM chains', () => {
    expect(
      isWalletAddressCompatibleWithChain(
        '0x0000000000000000000000000000000000000001',
        'eth',
      ),
    ).toBe(true);
  });

  it('rejects named and implicit NEAR accounts for EVM chains', () => {
    expect(isWalletAddressCompatibleWithChain('alice.near', 'eth')).toBe(false);
    expect(isWalletAddressCompatibleWithChain('a'.repeat(64), 'eth')).toBe(
      false,
    );
  });

  it('accepts named and implicit NEAR accounts for NEAR', () => {
    expect(isWalletAddressCompatibleWithChain('alice.near', 'near')).toBe(true);
    expect(isWalletAddressCompatibleWithChain('a'.repeat(64), 'near')).toBe(
      true,
    );
  });

  it('does not accept an EVM address for NEAR', () => {
    expect(
      isWalletAddressCompatibleWithChain(
        '0x0000000000000000000000000000000000000001',
        'near',
      ),
    ).toBe(false);
  });
});
