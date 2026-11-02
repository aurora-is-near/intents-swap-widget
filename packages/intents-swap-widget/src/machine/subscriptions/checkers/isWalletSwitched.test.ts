import type { Context, ContextChange } from '@/machine/context';
import { isWalletSwitched } from './isWalletSwitched';

const ctx = {} as Context;

const change = (previousValue: unknown, value: unknown) =>
  [{ key: 'walletAddress', previousValue, value }] as ContextChange[];

describe('isWalletSwitched', () => {
  it('is true when one wallet replaces another', () => {
    expect(isWalletSwitched(ctx, change('0xa', '0xb'))).toBe(true);
  });

  it('is false on connect, disconnect and no change', () => {
    expect(isWalletSwitched(ctx, change(undefined, '0xa'))).toBe(false);
    expect(isWalletSwitched(ctx, change('0xa', undefined))).toBe(false);
    expect(isWalletSwitched(ctx, change('0xa', '0xa'))).toBe(false);
    expect(
      isWalletSwitched(ctx, [
        { key: 'sendAddress', previousValue: 'x', value: 'y' },
      ] as ContextChange[]),
    ).toBe(false);
  });
});
