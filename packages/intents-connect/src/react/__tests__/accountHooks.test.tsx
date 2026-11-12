import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IntentsConnectApi } from '@/api/types';
import type { IntentsApi } from '@/intentsApi/types';
import { resetDeadNearRpcUrls } from '@/near/rpc';
import { invalidateSalt } from '@/ownership/salt';
import { memoryStorage } from '@/storage';
import type { WalletConnector } from '@/types/wallet';
import {
  IntentsConnectProvider,
  type IntentsConnectProviderProps,
  useConfidentialBalances,
  useIntentsAccount,
  useIntentsAuth,
  useIntentsBalances,
  useWalletBalances,
  useWalletVerification,
} from '@/react';

const ADDRESS = '0xCA67c1bb3fD69857E5EdAF6aA1C65371bF46A464';
const ACCOUNT = ADDRESS.toLowerCase();

const connectApi = (): IntentsConnectApi => ({
  getIntermediary: vi.fn(),
  createExecution: vi.fn(),
  createStepsExecution: vi.fn(),
  listSupportedTokens: vi.fn(),
  submitSignature: vi.fn(),
  recordDeposit: vi.fn(),
  listExecutions: vi.fn().mockResolvedValue([]),
  deleteExecution: vi.fn(),
});

const intentsApi = (overrides: Partial<IntentsApi> = {}): IntentsApi => ({
  apiKey: 'key',
  baseUrl: 'https://intents.test',
  nearRpcUrl: 'https://intents.test/rpc/key',
  getTokens: vi.fn(async () => ({
    tokens: [
      {
        assetId: 'nep141:base.omft.near',
        symbol: 'ETH',
        blockchain: 'base',
        decimals: 18,
        price: 1,
      },
    ],
    asset_stats: [],
  })),
  getIntentsAccountBalances: vi.fn(async () => ({
    blockHeight: 7,
    balances: [
      {
        tokenId: 'nep141:wrap.near',
        assetId: 'nep141:wrap.near',
        symbol: 'wNEAR',
        decimals: 24,
        amount: '5',
      },
    ],
  })),
  authenticate: vi.fn(async () => ({
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresIn: 900,
    refreshExpiresIn: 604800,
  })),
  refreshAccessToken: vi.fn(),
  getConfidentialBalances: vi.fn(async () => ({
    balances: [{ tokenId: 'nep141:usdc', available: '9', source: 'private' }],
  })),
  getQuote: vi.fn(),
  generateIntent: vi.fn(),
  submitIntent: vi.fn(),
  getSwapStatus: vi.fn(),
  ...overrides,
});

const wallet = (address = ADDRESS): WalletConnector => ({
  id: 'evm',
  name: 'Test',
  chains: ['base'],
  signingStandard: 'erc191',
  connect: vi.fn(),
  disconnect: vi.fn(),
  getAddress: () => address,
  getProviders: () => ({
    evm: {
      request: async ({ method }: { method: string }) =>
        method === 'eth_requestAccounts' ? [address] : `0x${'11'.repeat(65)}`,
    },
  }),
});

const bytes = (value: unknown) =>
  Array.from(new TextEncoder().encode(JSON.stringify(value)));

/** NEAR RPC (salt + simulate) and EVM JSON-RPC answered by one stub. */
const stubNetwork = (simulateError?: string) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as
        | { method: string; params: { method_name?: string } }
        | { id: number; method: string }[];

      if (Array.isArray(body)) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify(
              body.map(({ id }) => ({ jsonrpc: '2.0', id, result: '0x2a' })),
            ),
        };
      }

      const method = body.params.method_name;
      const result =
        method === 'simulate_intents' && simulateError
          ? { error: simulateError }
          : { result: bytes(method === 'current_salt' ? '0a0b0c0d' : {}) };

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ result }),
      };
    }),
  );

const wrapperFor =
  (props: Partial<IntentsConnectProviderProps>) =>
  ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <IntentsConnectProvider
        api={connectApi()}
        wallet={wallet()}
        verificationStorage={memoryStorage()}
        {...props}>
        {children}
      </IntentsConnectProvider>
    </StrictMode>
  );

beforeEach(() => {
  invalidateSalt();
  resetDeadNearRpcUrls();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('account hooks', () => {
  it('derive the wallet intents account', () => {
    const { result } = renderHook(() => useIntentsAccount(), {
      wrapper: wrapperFor({ intentsApi: intentsApi() }),
    });

    expect(result.current).toEqual({
      intentsAccountId: ACCOUNT,
      family: 'evm',
      address: ADDRESS,
    });
  });

  it('refuse to run without intentsApi', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      renderHook(() => useIntentsBalances(), { wrapper: wrapperFor({}) }),
    ).toThrow(/intentsApi/);
  });

  it('read wallet balances over the configured RPCs', async () => {
    stubNetwork();

    const { result } = renderHook(
      () => useWalletBalances({ refreshIntervalMs: 0 }),
      {
        wrapper: wrapperFor({
          intentsApi: intentsApi(),
          rpcs: { base: ['https://base.test'] },
        }),
      },
    );

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.balances).toEqual({ 'nep141:base.omft.near': '42' });
    expect(result.current.tokens).toHaveLength(1);
  });

  it('read public intents balances', async () => {
    const api = intentsApi();
    const { result } = renderHook(
      () => useIntentsBalances({ refreshIntervalMs: 0 }),
      { wrapper: wrapperFor({ intentsApi: api }) },
    );

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.balances).toEqual({ 'nep141:wrap.near': '5' });
    expect(result.current.blockHeight).toBe(7);
    expect(api.getIntentsAccountBalances).toHaveBeenCalledWith(ACCOUNT);
  });

  it('share one fetch between hooks reading the same data', async () => {
    const api = intentsApi();
    const { result } = renderHook(
      () => [
        useIntentsBalances({ refreshIntervalMs: 0 }),
        useIntentsBalances({ refreshIntervalMs: 0 }),
      ],
      { wrapper: wrapperFor({ intentsApi: api }) },
    );

    await waitFor(() => expect(result.current[1]?.status).toBe('success'));

    expect(api.getIntentsAccountBalances).toHaveBeenCalledTimes(1);
  });

  it('verify the wallet and remember it', async () => {
    stubNetwork();

    const { result } = renderHook(() => useWalletVerification(), {
      wrapper: wrapperFor({ intentsApi: intentsApi() }),
    });

    expect(result.current.isVerified).toBe(false);

    await act(async () => {
      await result.current.verify();
    });

    expect(result.current.status).toBe('verified');
    expect(result.current.isVerified).toBe(true);
  });

  it('report a rejected verification', async () => {
    stubNetwork('invalid signature');

    const { result } = renderHook(() => useWalletVerification(), {
      wrapper: wrapperFor({ intentsApi: intentsApi() }),
    });

    await act(async () => {
      await result.current.verify();
    });

    expect(result.current.status).toBe('rejected');
    expect(result.current.verdict).toMatchObject({
      reason: 'SIGNATURE_REJECTED',
    });
    expect(result.current.isVerified).toBe(false);
  });

  it('authorize with one signature, then read confidential balances', async () => {
    stubNetwork();

    const api = intentsApi();
    const { result } = renderHook(
      () => ({
        auth: useIntentsAuth(),
        verification: useWalletVerification(),
        confidential: useConfidentialBalances({ refreshIntervalMs: 0 }),
      }),
      { wrapper: wrapperFor({ intentsApi: api }) },
    );

    expect(result.current.confidential.status).toBe('idle');

    await act(async () => {
      await expect(
        result.current.auth.authorize({ verify: true }),
      ).resolves.toEqual({ authorized: true, verdict: { ok: true } });
    });

    expect(result.current.auth.status).toBe('authorized');
    expect(result.current.verification.isVerified).toBe(true);
    // The verified proof was reused: one signature, one authenticate.
    expect(api.authenticate).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(result.current.confidential.balances).toEqual({
        'nep141:usdc': '9',
      }),
    );

    expect(api.getConfidentialBalances).toHaveBeenCalledWith(
      'access',
      undefined,
    );
  });

  it('skip authentication when verification fails', async () => {
    stubNetwork('invalid signature');

    const api = intentsApi();
    const { result } = renderHook(() => useIntentsAuth(), {
      wrapper: wrapperFor({ intentsApi: api }),
    });

    await act(async () => {
      await expect(
        result.current.authorize({ verify: true }),
      ).resolves.toMatchObject({ authorized: false });
    });

    expect(api.authenticate).not.toHaveBeenCalled();
    expect(result.current.status).toBe('anonymous');
  });

  it('keep the session across re-renders with a new client object', async () => {
    stubNetwork();

    const sessionStorage = memoryStorage();
    let props: Partial<IntentsConnectProviderProps> = {
      intentsApi: intentsApi(),
      sessionStorage,
    };

    const { result, rerender } = renderHook(() => useIntentsAuth(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        wrapperFor(props)({ children }),
    });

    await act(async () => {
      await result.current.authorize();
    });

    // Same API identity, new object — as when created inline in a render.
    props = { intentsApi: intentsApi(), sessionStorage };
    rerender();

    expect(result.current.status).toBe('authorized');
  });

  it('reload data hooks when the intents-api identity changes', async () => {
    const first = intentsApi();
    const second = intentsApi({
      apiKey: 'other-key',
      getIntentsAccountBalances: vi.fn(async () => ({
        blockHeight: 9,
        balances: [],
      })),
    });

    let props: Partial<IntentsConnectProviderProps> = { intentsApi: first };
    const { result, rerender } = renderHook(
      () => useIntentsBalances({ refreshIntervalMs: 0 }),
      {
        wrapper: ({ children }: { children: ReactNode }) =>
          wrapperFor(props)({ children }),
      },
    );

    await waitFor(() => expect(result.current.blockHeight).toBe(7));

    props = { intentsApi: second };
    rerender();

    // No polling: only the store rebuild can trigger this load.
    await waitFor(() => expect(result.current.blockHeight).toBe(9));

    expect(second.getIntentsAccountBalances).toHaveBeenCalledWith(ACCOUNT);
  });

  it('keep a verification result with the account it ran for', async () => {
    stubNetwork();

    let current = wallet();
    const { result, rerender } = renderHook(() => useWalletVerification(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        wrapperFor({ intentsApi: intentsApi(), wallet: current })({
          children,
        }),
    });

    await act(async () => {
      await result.current.verify();
    });

    expect(result.current.status).toBe('verified');

    current = wallet('0x1111111111111111111111111111111111111111');
    rerender();

    expect(result.current.status).toBe('idle');
    expect(result.current.isVerified).toBe(false);
  });

  it('return the same balances object while the data is unchanged', async () => {
    const { result, rerender } = renderHook(
      () => useIntentsBalances({ refreshIntervalMs: 0 }),
      { wrapper: wrapperFor({ intentsApi: intentsApi() }) },
    );

    await waitFor(() => expect(result.current.status).toBe('success'));

    const { balances } = result.current;

    rerender();

    expect(result.current.balances).toBe(balances);
  });
});
