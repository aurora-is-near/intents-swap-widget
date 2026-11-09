import { base64 } from '@scure/base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BalanceRpcError,
  type BalanceToken,
  getBalanceSource,
  getWalletBalances,
  NATIVE_NEAR_ASSET_ID,
  normalizeTokens,
  readEvmTokenBalance,
  resolveRpcs,
  toQuoteAssetId,
} from '@/balances';
import { encodeBalanceOf } from '@/balances/evm';
import { getIntermediaryBalance } from '@/funding';
import type { FetchLike } from '@/http';
import { resetDeadNearRpcUrls } from '@/near/rpc';

const EVM = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const SOL = 'CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq';
const USDC_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const USDC_SOL = 'EPjFWdd5AufqSSqeM2qJ1zr6sGJ8h7RMfC6YqYzE4hXF';

const token = (
  blockchain: string,
  assetId: string,
  contractAddress?: string,
): BalanceToken => ({
  assetId,
  symbol: assetId,
  blockchain,
  decimals: 18,
  contractAddress,
  price: 1,
});

type Handler = (url: string, body: unknown) => unknown;

const fetchWith = (handler: Handler) =>
  vi.fn<FetchLike>(async (url, init) => {
    const body = JSON.parse(init!.body!) as unknown;
    const reply = handler(url, body);

    if (reply instanceof Error) {
      throw reply;
    }

    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(reply),
    };
  });

type RpcRequest = { id: number; method: string; params: unknown[] };

/** Answers a JSON-RPC batch item by item with `answer`. */
const batch =
  (answer: (request: RpcRequest) => unknown): Handler =>
  (_url, body) =>
    (body as RpcRequest[]).map((request) => ({
      jsonrpc: '2.0',
      id: request.id,
      ...(answer(request) as object),
    }));

beforeEach(() => resetDeadNearRpcUrls());

describe('normalizeTokens', () => {
  it('keeps every chain, lower-cased, and adds native NEAR next to wNEAR', () => {
    const tokens = normalizeTokens([
      {
        assetId: 'nep141:wrap.near',
        symbol: 'wNEAR',
        blockchain: 'NEAR',
        decimals: 24,
        price: 3,
        contractAddress: 'wrap.near',
      },
      {
        assetId: 'nep141:btc.omft.near',
        symbol: 'BTC',
        blockchain: 'btc',
        decimals: 8,
        price: 1,
      },
      {
        assetId: 'nep141:base.omft.near',
        symbol: 'ETH',
        blockchain: 'base',
        decimals: 18,
        price: 1,
      },
    ]);

    // Bitcoin can't be read from a wallet, but an intents account holds it.
    expect(tokens.map((t) => t.assetId)).toEqual([
      'nep141:wrap.near',
      NATIVE_NEAR_ASSET_ID,
      'nep141:btc.omft.near',
      'nep141:base.omft.near',
    ]);
    expect(tokens[1]).toMatchObject({
      blockchain: 'near',
      decimals: 24,
      price: 3,
      contractAddress: undefined,
    });
  });
});

describe('rpc selection', () => {
  it('merges custom RPCs chain by chain', () => {
    const rpcs = resolveRpcs({ base: ['https://my-base.test'] });

    expect(rpcs.base).toEqual(['https://my-base.test']);
    expect(rpcs.eth?.length).toBeGreaterThan(0);
  });

  it('prefers Alchemy for indexed chains when keyed', () => {
    const rpcs = resolveRpcs();

    expect(getBalanceSource('base', { alchemyApiKey: 'k', rpcs })).toBe(
      'alchemy',
    );
    expect(getBalanceSource('bsc', { alchemyApiKey: 'k', rpcs })).toBe('rpc');
    expect(getBalanceSource('base', { rpcs })).toBe('rpc');
    expect(getBalanceSource('base', { rpcs: { base: [] } })).toBe('none');
    expect(getBalanceSource('near', { alchemyApiKey: 'k', rpcs })).toBe('rpc');
  });
});

describe('EVM over RPC', () => {
  const tokens = [
    token('base', 'nep141:base.omft.near'),
    token('base', 'usdc-a', USDC_BASE),
    token('base', 'usdc-b', USDC_BASE.toUpperCase().replace('0X', '0x')),
    token('base', 'broken', '0x0000000000000000000000000000000000000001'),
  ];

  it('batches one call per contract and maps it to every asset id', async () => {
    const fetchImpl = fetchWith(
      batch((request) => {
        if (request.method === 'eth_getBalance') {
          return { result: '0x10' };
        }

        const [{ to, data }] = request.params as [{ to: string; data: string }];

        expect(data).toBe(encodeBalanceOf(EVM));

        return to === USDC_BASE
          ? {
              result:
                '0x0000000000000000000000000000000000000000000000000000000000000064',
            }
          : { error: { code: 3, message: 'execution reverted' } };
      }),
    );

    const { balances, errors } = await getWalletBalances({
      family: 'evm',
      address: EVM,
      tokens,
      rpcs: { base: ['https://base.test'] },
      fetch: fetchImpl,
    });

    expect(errors).toEqual({});
    expect(balances).toEqual({
      'nep141:base.omft.near': '16',
      'usdc-a': '100',
      'usdc-b': '100',
    });

    const sent = JSON.parse(fetchImpl.mock.calls[0]![1]!.body!) as unknown[];

    expect(sent).toHaveLength(3);
  });

  it('retries unbatched when an endpoint refuses batches', async () => {
    const fetchImpl = fetchWith((_url, body) =>
      Array.isArray(body)
        ? {
            jsonrpc: '2.0',
            id: null,
            error: { message: 'batch not supported' },
          }
        : { jsonrpc: '2.0', id: 0, result: '0x1' },
    );

    const { balances } = await getWalletBalances({
      family: 'evm',
      address: EVM,
      tokens: [token('base', 'eth')],
      rpcs: { base: ['https://base.test'] },
      fetch: fetchImpl,
    });

    expect(balances).toEqual({ eth: '1' });
  });

  it('fails over across endpoints and reports a chain that is down', async () => {
    const fetchImpl = fetchWith((url, body) =>
      url.includes('down')
        ? new TypeError('Failed to fetch')
        : batch(() => ({ result: '0x2' }))(url, body),
    );

    const { balances, errors } = await getWalletBalances({
      family: 'evm',
      address: EVM,
      tokens: [token('base', 'eth'), token('arb', 'arb-eth')],
      rpcs: {
        base: ['https://down.test', 'https://base.test'],
        arb: ['https://down.test'],
      },
      fetch: fetchImpl,
    });

    expect(balances).toEqual({ eth: '2' });
    expect(errors.arb).toBeInstanceOf(BalanceRpcError);
  });

  it('chunks large batches', async () => {
    const many = Array.from({ length: 45 }, (_, index) =>
      token('base', `t${index}`, `0x${index.toString(16).padStart(40, '0')}`),
    );

    const fetchImpl = fetchWith(batch(() => ({ result: '0x0' })));

    await getWalletBalances({
      family: 'evm',
      address: EVM,
      tokens: many,
      rpcs: { base: ['https://base.test'] },
      fetch: fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe('Solana over RPC', () => {
  const account = (mint: string, amount: string) => ({
    account: {
      data: { parsed: { info: { mint, tokenAmount: { amount } } } },
    },
  });

  const solTokens = [
    token('sol', 'sol'),
    token('sol', 'usdc', USDC_SOL),
    token('sol', 'none', 'Mint111'),
  ];

  it('reads SOL and sums every account of a mint across both token programs', async () => {
    const fetchImpl = fetchWith(
      batch((request) => {
        if (request.method === 'getBalance') {
          return { result: { value: 5_000_000 } };
        }

        const [, { programId }] = request.params as [
          string,
          { programId: string },
        ];

        return {
          result: {
            value: programId.startsWith('Tokenkeg')
              ? [account(USDC_SOL, '10'), account(USDC_SOL, '5')]
              : [account('Other', '1')],
          },
        };
      }),
    );

    const { balances, errors } = await getWalletBalances({
      family: 'sol',
      address: SOL,
      tokens: solTokens,
      rpcs: { sol: ['https://sol.test'] },
      fetch: fetchImpl,
    });

    expect(errors).toEqual({});
    expect(balances).toEqual({ sol: '5000000', usdc: '15', none: '0' });
  });

  it('moves to the next endpoint when one refuses token-account queries in-band', async () => {
    const fetchImpl = fetchWith((url, body) =>
      batch((request) => {
        if (request.method === 'getBalance') {
          return { result: { value: 1 } };
        }

        return url.includes('refuses')
          ? {
              error: {
                code: -32602,
                message: 'Indexed requests require a personal token',
              },
            }
          : {
              result: {
                value: JSON.stringify(request.params).includes('Tokenkeg')
                  ? [account(USDC_SOL, '3')]
                  : [],
              },
            };
      })(url, body),
    );

    const { balances, errors } = await getWalletBalances({
      family: 'sol',
      address: SOL,
      tokens: solTokens,
      rpcs: { sol: ['https://refuses.test', 'https://serves.test'] },
      fetch: fetchImpl,
    });

    expect(errors).toEqual({});
    expect(balances.usdc).toBe('3');
  });

  it('keeps SOL and reports SPL as a partial failure when no endpoint serves it', async () => {
    const fetchImpl = fetchWith(
      batch((request) =>
        request.method === 'getBalance'
          ? { result: { value: 9 } }
          : { error: { code: 429, message: 'Too many requests' } },
      ),
    );

    const { balances, errors } = await getWalletBalances({
      family: 'sol',
      address: SOL,
      tokens: solTokens,
      rpcs: { sol: ['https://sol.test'] },
      fetch: fetchImpl,
    });

    expect(balances).toEqual({ sol: '9' });
    expect(errors.sol?.message).toContain('Too many requests');
  });
});

describe('NEAR over RPC', () => {
  const view = (value: unknown) => ({
    result: {
      result: Array.from(new TextEncoder().encode(JSON.stringify(value))),
    },
  });

  it('reads native NEAR and NEP-141s, skipping a contract that rejects the call', async () => {
    const fetchImpl = fetchWith((_url, body) => {
      const { params } = body as {
        params: {
          request_type: string;
          account_id: string;
          args_base64?: string;
        };
      };

      if (params.request_type === 'view_account') {
        return { result: { amount: '7' } };
      }

      expect(
        JSON.parse(
          new TextDecoder().decode(base64.decode(params.args_base64!)),
        ),
      ).toEqual({ account_id: 'alice.near' });

      return params.account_id === 'broken.near'
        ? { result: { error: 'MethodNotFound' } }
        : view('42');
    });

    const { balances, errors } = await getWalletBalances({
      family: 'near',
      address: 'alice.near',
      tokens: [
        token('near', NATIVE_NEAR_ASSET_ID),
        token('near', 'nep141:wrap.near', 'wrap.near'),
        token('near', 'nep141:broken.near', 'broken.near'),
      ],
      rpcs: { near: ['https://near.test'] },
      fetch: fetchImpl,
    });

    expect(errors).toEqual({});
    expect(balances).toEqual({
      [NATIVE_NEAR_ASSET_ID]: '7',
      'nep141:wrap.near': '42',
    });
  });

  it('puts the intents-api proxy after the public endpoints', async () => {
    const fetchImpl = fetchWith((url) =>
      url.includes('proxy')
        ? { result: { amount: '1' } }
        : new TypeError('Failed to fetch'),
    );

    const { balances } = await getWalletBalances({
      family: 'near',
      address: 'alice.near',
      tokens: [token('near', NATIVE_NEAR_ASSET_ID)],
      rpcs: { near: ['https://public.test'] },
      intentsApi: { nearRpcUrl: 'https://proxy.test/rpc/k' },
      fetch: fetchImpl,
    });

    expect(balances).toEqual({ [NATIVE_NEAR_ASSET_ID]: '1' });
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'https://public.test',
      'https://proxy.test/rpc/k',
    ]);
  });
});

describe('Alchemy', () => {
  const portfolio = (
    tokens: {
      network: string;
      tokenAddress: string | null;
      tokenBalance: string;
    }[],
    pageKey: string | null = null,
  ) => ({ data: { tokens, pageKey } });

  it('reads every indexed chain in one request and zero-fills a complete result', async () => {
    const fetchImpl = fetchWith((url, body) => {
      expect(url).toContain('/k/assets/tokens/balances/by-address');
      expect(body).toMatchObject({
        addresses: [
          { address: EVM, networks: ['base-mainnet', 'eth-mainnet'] },
        ],
      });

      return portfolio([
        { network: 'base-mainnet', tokenAddress: null, tokenBalance: '0x5' },
        {
          network: 'base-mainnet',
          tokenAddress: USDC_BASE,
          tokenBalance: '0x64',
        },
        // Same contract on another chain must not leak into base.
        {
          network: 'eth-mainnet',
          tokenAddress: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
          tokenBalance: '0x9',
        },
      ]);
    });

    const { balances } = await getWalletBalances({
      family: 'evm',
      address: EVM,
      alchemyApiKey: 'k',
      tokens: [
        token('base', 'base-eth'),
        token('base', 'usdc', USDC_BASE),
        token(
          'base',
          'cbbtc-base',
          '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
        ),
        token('eth', 'cbbtc-eth', '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf'),
      ],
      fetch: fetchImpl,
    });

    expect(balances).toEqual({
      'base-eth': '5',
      usdc: '100',
      'cbbtc-base': '0',
      'cbbtc-eth': '9',
    });
  });

  it('follows page keys and reads tokens past the page cap over RPC', async () => {
    let page = 0;
    const fetchImpl = fetchWith((url, body) => {
      if (!url.includes('alchemy')) {
        return batch(() => ({
          result:
            '0x0000000000000000000000000000000000000000000000000000000000000007',
        }))(url, body);
      }

      page += 1;

      expect((body as { pageKey: string | null }).pageKey).toBe(
        page === 1 ? null : `p${page - 1}`,
      );

      return portfolio(
        [{ network: 'base-mainnet', tokenAddress: null, tokenBalance: '0x1' }],
        `p${page}`,
      );
    });

    const { balances } = await getWalletBalances({
      family: 'evm',
      address: EVM,
      alchemyApiKey: 'k',
      tokens: [token('base', 'base-eth'), token('base', 'unseen', USDC_BASE)],
      rpcs: { base: ['https://base.test'] },
      fetch: fetchImpl,
    });

    expect(page).toBe(3);
    expect(balances).toEqual({ 'base-eth': '1', unseen: '7' });
  });

  it('falls back to RPCs when Alchemy fails', async () => {
    const fetchImpl = fetchWith((url, body) =>
      url.includes('alchemy')
        ? new TypeError('Failed to fetch')
        : batch(() => ({ result: '0x3' }))(url, body),
    );

    const { balances, errors } = await getWalletBalances({
      family: 'evm',
      address: EVM,
      alchemyApiKey: 'k',
      tokens: [token('base', 'base-eth')],
      rpcs: { base: ['https://base.test'] },
      fetch: fetchImpl,
    });

    expect(errors).toEqual({});
    expect(balances).toEqual({ 'base-eth': '3' });
  });

  it('reads Monad native and stablecoins from the Monad node', async () => {
    const monadUsdc = '0x754704bc059f8c67012fed69bc8a327a5aafb603';
    const fetchImpl = fetchWith((url, body) =>
      url.includes('monad-mainnet.g.alchemy.com')
        ? batch((request) => ({
            result: request.method === 'eth_getBalance' ? '0xa' : '0xb',
          }))(url, body)
        : portfolio([
            // Misreported by the portfolio API — must be ignored.
            {
              network: 'monad-mainnet',
              tokenAddress: null,
              tokenBalance: '0x999',
            },
          ]),
    );

    const { balances } = await getWalletBalances({
      family: 'evm',
      address: EVM,
      alchemyApiKey: 'k',
      tokens: [token('monad', 'mon'), token('monad', 'usdc', monadUsdc)],
      fetch: fetchImpl,
    });

    expect(balances).toEqual({ mon: '10', usdc: '11' });
  });
});

describe('getWalletBalances', () => {
  it('ignores tokens of other families', async () => {
    const fetchImpl = fetchWith(batch(() => ({ result: '0x1' })));

    const { balances } = await getWalletBalances({
      family: 'evm',
      address: EVM,
      tokens: [token('sol', 'sol'), token('near', 'wrap', 'wrap.near')],
      fetch: fetchImpl,
    });

    expect(balances).toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('readEvmTokenBalance', () => {
  it('reads an ERC-20 with balanceOf and the native asset with eth_getBalance', async () => {
    const requests: RpcRequest[] = [];
    const fetchImpl = fetchWith(
      batch((request) => {
        requests.push(request);

        return { result: request.method === 'eth_call' ? '0x64' : '0x10' };
      }),
    );

    await expect(
      readEvmTokenBalance({
        owner: EVM,
        tokenAddress: USDC_BASE,
        rpcUrls: ['https://base.test'],
        fetch: fetchImpl,
      }),
    ).resolves.toBe('100');
    await expect(
      readEvmTokenBalance({
        owner: EVM,
        rpcUrls: ['https://base.test'],
        fetch: fetchImpl,
      }),
    ).resolves.toBe('16');

    expect(requests[0]).toMatchObject({
      method: 'eth_call',
      params: [{ to: USDC_BASE, data: encodeBalanceOf(EVM) }, 'latest'],
    });
    expect(requests[1]).toMatchObject({ method: 'eth_getBalance' });
  });

  it('reads `0x` (no contract) as zero', async () => {
    const fetchImpl = fetchWith(batch(() => ({ result: '0x' })));

    await expect(
      readEvmTokenBalance({
        owner: EVM,
        tokenAddress: USDC_BASE,
        rpcUrls: ['https://base.test'],
        fetch: fetchImpl,
      }),
    ).resolves.toBe('0');
  });

  it('throws instead of reading a failure as zero', async () => {
    const reverted = fetchWith(
      batch(() => ({ error: { code: 3, message: 'execution reverted' } })),
    );

    const down = fetchWith(() => new Error('offline'));

    await expect(
      readEvmTokenBalance({
        owner: EVM,
        tokenAddress: USDC_BASE,
        rpcUrls: ['https://base.test'],
        fetch: reverted,
      }),
    ).rejects.toBeInstanceOf(BalanceRpcError);
    await expect(
      readEvmTokenBalance({
        owner: EVM,
        tokenAddress: USDC_BASE,
        rpcUrls: ['https://base.test'],
        fetch: down,
      }),
    ).rejects.toBeInstanceOf(BalanceRpcError);
  });
});

describe('getIntermediaryBalance', () => {
  it("reads the destination token on the destination chain's RPC", async () => {
    const urls: string[] = [];
    const fetchImpl = fetchWith((url, body) => {
      urls.push(url);

      return batch(() => ({ result: '0x2a' }))(url, body);
    });

    await expect(
      getIntermediaryBalance({
        intermediary: { evm: EVM },
        destination: {
          chain: 'monad',
          assetId: 'nep245:monad-usdc',
          tokenAddress: USDC_BASE,
        },
        rpcs: { monad: ['https://monad.test'] },
        fetch: fetchImpl,
      }),
    ).resolves.toBe('42');
    expect(urls).toEqual(['https://monad.test']);
  });

  it('refuses a non-EVM destination', async () => {
    await expect(
      getIntermediaryBalance({
        intermediary: { evm: EVM },
        destination: { chain: 'sol', assetId: 'nep141:sol-usdc' },
      }),
    ).rejects.toThrow(/EVM chains only/);
  });
});

describe('toQuoteAssetId', () => {
  it('quotes native NEAR as wNEAR, and every other token as itself', () => {
    expect(toQuoteAssetId({ assetId: NATIVE_NEAR_ASSET_ID })).toBe(
      'nep141:wrap.near',
    );
    expect(toQuoteAssetId({ assetId: 'nep141:wrap.near' })).toBe(
      'nep141:wrap.near',
    );
    expect(toQuoteAssetId({ assetId: 'nep141:usdc.near' })).toBe(
      'nep141:usdc.near',
    );
  });
});
