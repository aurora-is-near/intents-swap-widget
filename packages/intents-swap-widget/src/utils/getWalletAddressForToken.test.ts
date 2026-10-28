import type { Token } from '@/types/token';

import { getWalletAddressForToken } from './getWalletAddressForToken';

const EVM_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const SOL_ADDRESS = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';

const makeToken = (blockchain: Token['blockchain']) =>
  ({ blockchain }) as Token;

describe('getWalletAddressForToken', () => {
  it('returns the wallet keyed by the token chain', () => {
    expect(
      getWalletAddressForToken(
        { default: EVM_ADDRESS, sol: SOL_ADDRESS },
        makeToken('sol'),
      ),
    ).toBe(SOL_ADDRESS);
  });

  it('falls back to the default wallet', () => {
    expect(
      getWalletAddressForToken({ default: EVM_ADDRESS }, makeToken('sol')),
    ).toBe(EVM_ADDRESS);

    expect(getWalletAddressForToken({ default: EVM_ADDRESS })).toBe(
      EVM_ADDRESS,
    );
  });

  it('falls back to a chain-keyed wallet when there is no token', () => {
    expect(getWalletAddressForToken({ sol: SOL_ADDRESS })).toBe(SOL_ADDRESS);
  });

  it('does not use another chain wallet for a token', () => {
    expect(
      getWalletAddressForToken({ sol: SOL_ADDRESS }, makeToken('eth')),
    ).toBeUndefined();
  });

  it('returns undefined when no wallet is connected', () => {
    expect(getWalletAddressForToken({})).toBeUndefined();
    expect(getWalletAddressForToken({ sol: null })).toBeUndefined();
  });
});
