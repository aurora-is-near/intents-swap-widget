import { renderHook } from '@testing-library/react';

import { useIntentsAccountId } from './useIntentsAccountId';

const mockUseConfig = jest.fn();
const mockUseUnsafeSnapshot = jest.fn();

jest.mock('@/config', () => ({ useConfig: () => mockUseConfig() }));
jest.mock('../machine', () => ({
  useUnsafeSnapshot: () => mockUseUnsafeSnapshot(),
}));
jest.mock('@/logger', () => ({ logger: { error: jest.fn() } }));

const WALLET = '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD';
const ACCOUNT = '0x1234567890123456789012345678901234567890';

const setup = (config: Record<string, unknown>, walletAddress?: string) => {
  mockUseConfig.mockReturnValue(config);
  mockUseUnsafeSnapshot.mockReturnValue({ ctx: { walletAddress } });

  return renderHook(() => useIntentsAccountId()).result.current;
};

describe('useIntentsAccountId', () => {
  it('derives the account from the connected wallet by default', () => {
    expect(setup({ intentsAccountType: 'evm' }, WALLET)).toBe(
      WALLET.toLowerCase(),
    );
  });

  it('returns the configured account over the derived one', () => {
    expect(
      setup({ intentsAccountType: 'evm', intentsAccountId: ACCOUNT }, WALLET),
    ).toBe(ACCOUNT);
    expect(
      setup(
        { intentsAccountType: 'sol', intentsAccountId: 'alice.near' },
        WALLET,
      ),
    ).toBe('alice.near');
  });

  it('ignores a malformed configured account', () => {
    expect(
      setup(
        { intentsAccountType: 'evm', intentsAccountId: 'not an id' },
        WALLET,
      ),
    ).toBe(WALLET.toLowerCase());
  });

  it('is undefined without a wallet or an override', () => {
    expect(setup({ intentsAccountType: 'evm' })).toBeUndefined();
  });
});
