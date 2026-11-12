import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IntentsConnectApi } from '@/api/types';
import type { FundingRequest } from '@/funding';
import type { IntentsApi, SwapQuoteRequest } from '@/intentsApi/types';
import { memoryStorage } from '@/storage';
import type { WalletConnector } from '@/types/wallet';
import { IntentsConnectProvider, useFundingPreview } from '@/react';

const ADDRESS = '0xCA67c1bb3fD69857E5EdAF6aA1C65371bF46A464';
const INTERMEDIARY = '0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E';

const REQUEST: FundingRequest = {
  source: 'intents',
  originAsset: 'nep141:base-usdc.omft.near',
  amount: '1000000',
  destination: {
    chain: 'monad',
    assetId: 'nep245:monad-usdc',
    tokenAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
  },
};

const setup = (request: FundingRequest | null = REQUEST) => {
  let quotes = 0;
  const getQuote = vi.fn(async (body: SwapQuoteRequest) => {
    quotes += 1;

    return {
      correlationId: 'c',
      timestamp: '',
      signature: '',
      quoteRequest: body,
      quote: {
        amountIn: body.amount,
        minAmountIn: body.amount,
        amountOut: '990000',
        minAmountOut: String(980_000 - quotes),
        timeEstimate: 20,
      },
    };
  });

  const intentsApi = {
    apiKey: 'key',
    baseUrl: 'https://intents.test',
    nearRpcUrl: 'https://intents.test/rpc/key',
    getQuote,
  } as unknown as IntentsApi;

  const api = {
    getIntermediary: vi.fn(async () => ({
      originAccount: ADDRESS,
      originType: 'evm' as const,
      evm: INTERMEDIARY,
      solana: null,
    })),
    listExecutions: vi.fn().mockResolvedValue([]),
  } as unknown as IntentsConnectApi;

  const wallet = {
    id: 'evm',
    name: 'Test',
    chains: ['base'],
    signingStandard: 'erc191',
    connect: vi.fn(),
    disconnect: vi.fn(),
    getAddress: () => ADDRESS,
    getProviders: () => ({}),
  } as unknown as WalletConnector;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <IntentsConnectProvider
        api={api}
        wallet={wallet}
        intentsApi={intentsApi}
        fundingStorage={memoryStorage()}>
        {children}
      </IntentsConnectProvider>
    </StrictMode>
  );

  const hook = renderHook(
    ({ current }: { current: FundingRequest | null }) =>
      useFundingPreview({ request: current, debounceMs: 0 }),
    { wrapper, initialProps: { current: request } },
  );

  return { ...hook, getQuote };
};

afterEach(() => {
  vi.useRealTimers();
});

describe('useFundingPreview', () => {
  it('prices the request with a dry quote', async () => {
    const h = setup();

    expect(h.result.current.isLoading).toBe(true);

    await waitFor(() =>
      expect(h.result.current.preview?.recipient).toBe(INTERMEDIARY),
    );

    expect(h.result.current.isLoading).toBe(false);
    expect(h.getQuote).toHaveBeenCalledWith(
      expect.objectContaining({ dry: true, recipient: INTERMEDIARY }),
      {},
    );
  });

  it('waits for a request, and prices again on refresh', async () => {
    const h = setup(null);

    expect(h.result.current).toMatchObject({ isLoading: false });
    expect(h.getQuote).not.toHaveBeenCalled();

    h.rerender({ current: REQUEST });
    await waitFor(() => expect(h.result.current.preview).toBeDefined());

    const first = h.result.current.preview?.minAmountOut;

    act(() => h.result.current.refresh());
    await waitFor(() =>
      expect(h.result.current.preview?.minAmountOut).not.toBe(first),
    );
  });

  it('reports a confidential request without a session as an error', async () => {
    const h = setup({ ...REQUEST, source: 'confidential' });

    await waitFor(() =>
      expect(h.result.current.error).toMatchObject({ code: 'NOT_AUTHORIZED' }),
    );

    expect(h.getQuote).not.toHaveBeenCalled();
  });
});
