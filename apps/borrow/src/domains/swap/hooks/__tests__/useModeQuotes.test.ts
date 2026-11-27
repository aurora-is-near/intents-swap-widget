import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useModeQuotes } from '../useModeQuotes';

type FakeContext = {
  quote?: { amountOutFormatted: string };
  quoteStatus: 'idle' | 'pending' | 'success';
  confidentialMode: 'confidential' | 'public';
  sourceToken?: { assetId: string };
  targetToken?: { assetId: string; symbol: string };
  sourceTokenAmount: string;
};

const store: { ctx: FakeContext } = { ctx: {} as FakeContext };

vi.mock('@aurora-is-near/intents-swap-widget', () => ({
  useUnsafeSnapshot: () => ({ ctx: store.ctx }),
}));

const ETH = { assetId: 'nep141:eth.omft.near' };
const USDC = { assetId: 'nep141:usdc', symbol: 'USDC' };
const USDT = { assetId: 'nep141:usdt', symbol: 'USDT' };

/** The widget's store after a change: a new context, as valtio gives. */
const setCtx = (change: Partial<FakeContext>) => {
  store.ctx = { ...store.ctx, ...change };
};

describe('useModeQuotes', () => {
  beforeEach(() => {
    store.ctx = {
      quoteStatus: 'idle',
      confidentialMode: 'confidential',
      sourceToken: ETH,
      targetToken: USDC,
      sourceTokenAmount: '0.04',
    };
  });

  it('puts a quote on the card of the mode it was fetched in', () => {
    const { result, rerender } = renderHook(() => useModeQuotes());

    setCtx({ quote: { amountOutFormatted: '119.4' }, quoteStatus: 'success' });
    rerender();

    expect(result.current.quotes).toEqual({ confidential: '≈ 119.4 USDC' });
  });

  it('keeps the other mode’s last quote after a switch', () => {
    const { result, rerender } = renderHook(() => useModeQuotes());

    setCtx({ quote: { amountOutFormatted: '119.4' }, quoteStatus: 'success' });
    rerender();

    // The switch: the old quote is still in the store until the widget
    // quotes again, so it must not land on the Standard card.
    setCtx({ confidentialMode: 'public' });
    rerender();

    expect(result.current.quotes).toEqual({ confidential: '≈ 119.4 USDC' });

    setCtx({ quote: undefined, quoteStatus: 'pending' });
    rerender();

    expect(result.current.isQuoting).toBe(true);

    setCtx({ quote: { amountOutFormatted: '119.8' }, quoteStatus: 'success' });
    rerender();

    expect(result.current).toEqual({
      quotes: { confidential: '≈ 119.4 USDC', public: '≈ 119.8 USDC' },
      isQuoting: false,
    });
  });

  it('drops both quotes once the swap changes', () => {
    const { result, rerender } = renderHook(() => useModeQuotes());

    setCtx({ quote: { amountOutFormatted: '119.4' }, quoteStatus: 'success' });
    rerender();
    setCtx({ targetToken: USDT, quote: undefined, quoteStatus: 'idle' });
    rerender();

    expect(result.current.quotes).toEqual({});
  });

  it('rounds the amount to six decimals', () => {
    const { result, rerender } = renderHook(() => useModeQuotes());

    setCtx({
      quote: { amountOutFormatted: '1234.123456789' },
      quoteStatus: 'success',
    });
    rerender();

    expect(result.current.quotes.confidential).toBe('≈ 1,234.123457 USDC');
  });

  it('keeps a tiny amount from rounding to 0', () => {
    const { result, rerender } = renderHook(() => useModeQuotes());

    setCtx({
      quote: { amountOutFormatted: '0.000000123456789' },
      quoteStatus: 'success',
    });
    rerender();

    expect(result.current.quotes.confidential).toBe('≈ 0.000000123457 USDC');
  });
});
