import { describe, expect, it } from 'vitest';

import { type CtaInput, type CtaState, ctaState } from './ctaState';

const ETH = 10n ** 18n;
const USDC = 10n ** 6n;

/** Everything in place: the state is `ready`. */
const READY: CtaInput = {
  connected: true,
  amount: ETH,
  balance: 2n * ETH,
  borrowAmount: 1_234n * USDC,
  borrow: { symbol: 'USDC', decimals: 6 },
  market: { name: 'Aave' },
  sendToOther: false,
  recipient: { status: 'empty' },
};

const kindOf = (overrides: Partial<CtaInput>) =>
  ctaState({ ...READY, ...overrides }).kind;

describe('ctaState', () => {
  it('is ready with the borrow amount, symbol and market name for the label', () => {
    expect(ctaState(READY)).toEqual({
      kind: 'ready',
      borrowAmount: 1_234n * USDC,
      decimals: 6,
      symbol: 'USDC',
      marketName: 'Aave',
    });
  });

  it('asks to connect when no wallet is connected', () => {
    expect(kindOf({ connected: false })).toBe('connect');
  });

  it('asks for an amount when none is entered, or it borrows nothing', () => {
    expect(kindOf({ amount: 0n, borrowAmount: 0n })).toBe('enterAmount');
    // LTV 0.
    expect(kindOf({ borrowAmount: 0n })).toBe('enterAmount');
  });

  it('says the balance is too low when the amount is above it', () => {
    expect(kindOf({ amount: 2n * ETH + 1n })).toBe('insufficientBalance');
    expect(kindOf({ amount: 2n * ETH })).toBe('ready');
  });

  it('does not call an unread balance insufficient', () => {
    expect(kindOf({ amount: 2n * ETH + 1n, balance: undefined })).toBe('ready');
  });

  it('says the LTV is too high when no market fits it', () => {
    expect(kindOf({ market: undefined })).toBe('ltvTooHigh');
  });

  it('asks for a recipient when the box is ticked and the address is empty or invalid', () => {
    expect(kindOf({ sendToOther: true })).toBe('enterRecipient');
    expect(
      kindOf({ sendToOther: true, recipient: { status: 'invalid' } }),
    ).toBe('enterRecipient');
    expect(
      kindOf({
        sendToOther: true,
        recipient: {
          status: 'valid',
          address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        },
      }),
    ).toBe('ready');
  });

  it('ignores an invalid address while the box is not ticked', () => {
    expect(kindOf({ recipient: { status: 'invalid' } })).toBe('ready');
  });

  describe('with a non-EVM wallet', () => {
    const NON_EVM: Partial<CtaInput> = { recipientRequired: true };

    it('blocks the ready state until a valid EVM recipient is entered, box ticked or not', () => {
      expect(kindOf(NON_EVM)).toBe('enterRecipient');
      expect(kindOf({ ...NON_EVM, sendToOther: true })).toBe('enterRecipient');
      expect(kindOf({ ...NON_EVM, recipient: { status: 'invalid' } })).toBe(
        'enterRecipient',
      );
      expect(
        kindOf({
          ...NON_EVM,
          recipient: {
            status: 'valid',
            address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          },
        }),
      ).toBe('ready');
    });

    it('still asks to connect, for an amount and so on first', () => {
      expect(kindOf({ ...NON_EVM, connected: false })).toBe('connect');
      expect(kindOf({ ...NON_EVM, amount: 0n })).toBe('enterAmount');
      expect(kindOf({ ...NON_EVM, market: undefined })).toBe('ltvTooHigh');
    });
  });

  it('with an EVM wallet, needs no recipient unless the box is ticked', () => {
    expect(kindOf({ recipientRequired: false })).toBe('ready');
    expect(kindOf({ recipientRequired: false, sendToOther: true })).toBe(
      'enterRecipient',
    );
  });

  describe('priority', () => {
    /** Every state's cause at once; each step below removes one. */
    const ALL_WRONG: Partial<CtaInput> = {
      connected: false,
      amount: 0n,
      borrowAmount: 0n,
      balance: 0n,
      market: undefined,
      sendToOther: true,
      recipient: { status: 'invalid' },
    };

    it.each<[string, Partial<CtaInput>, CtaState['kind']]>([
      ['every cause', ALL_WRONG, 'connect'],
      ['connected', { ...ALL_WRONG, connected: true }, 'enterAmount'],
      [
        'an amount above the balance',
        { ...ALL_WRONG, connected: true, amount: ETH, borrowAmount: USDC },
        'insufficientBalance',
      ],
      [
        'enough balance',
        {
          ...ALL_WRONG,
          connected: true,
          amount: ETH,
          borrowAmount: USDC,
          balance: ETH,
        },
        'ltvTooHigh',
      ],
      [
        'a market that fits',
        {
          ...ALL_WRONG,
          connected: true,
          amount: ETH,
          borrowAmount: USDC,
          balance: ETH,
          market: { name: 'Aave' },
        },
        'enterRecipient',
      ],
    ])('with %s, is %s', (_, overrides, kind) => {
      expect(kindOf(overrides)).toBe(kind);
    });
  });
});
