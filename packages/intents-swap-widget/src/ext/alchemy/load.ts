import { z } from 'zod';

import { isEvmAddress } from '../../utils/chains/isEvmAddress';
import { isTonAddress } from '../../utils/chains/isTonAddress';
import { CHAINS_MAP, isAlchemySupportedChain } from './types';
import type {
  AlchemyBalanceItem,
  AlchemyRequestParams,
  AlchemyResponse,
} from './types';
import { alchemyApi } from '@/network';
import type { Chains } from '@/types/chain';

const alchemyBalanceItemSchema = z.object({
  network: z.string(),
  tokenAddress: z.string().nullable(),
  tokenBalance: z.string(),
});

const resultPageSchema = z.object({
  pageKey: z.string().nullable(),
  tokens: z.array(alchemyBalanceItemSchema),
});

const portfolioResponseSchema = z.object({
  data: resultPageSchema,
});

const rpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
});

const rpcEthGetBalanceResponseSchema = z.object({
  result: z.string().optional(),
  error: rpcErrorSchema.optional(),
});

const compositePageKeySchema = z.object({
  portfolioPageKey: z.string().nullable(),
  monadPageKeys: z.record(z.string(), z.string()),
});

type CompositePageKey = z.infer<typeof compositePageKeySchema>;

const COMPOSITE_PAGE_KEY_PREFIX = 'alchemy-composite:';
const MONAD_NODE_URL = (apiKey: string) =>
  `https://${CHAINS_MAP.monad}.g.alchemy.com/v2/${apiKey}`;

const MONAD_ERC20_CONTRACTS = [
  // USDC on Monad
  '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
  // USDT0 on Monad
  '0xe7cd86e13AC4309349F30B3435a9d337750fC82D',
] as const;

const encodeBalanceOfData = (address: string): string => {
  const selector = '70a08231'; // keccak256('balanceOf(address)').slice(0, 8)
  const cleanAddress = address.toLowerCase().replace(/^0x/, '');
  const paddedAddress = cleanAddress.padStart(64, '0');

  return `0x${selector}${paddedAddress}`;
};

const encodeCompositePageKey = (value: CompositePageKey): string => {
  return `${COMPOSITE_PAGE_KEY_PREFIX}${encodeURIComponent(JSON.stringify(value))}`;
};

const decodeCompositePageKey = (value: string): CompositePageKey | null => {
  if (!value.startsWith(COMPOSITE_PAGE_KEY_PREFIX)) {
    return null;
  }

  try {
    const raw = value.slice(COMPOSITE_PAGE_KEY_PREFIX.length);
    const json = JSON.parse(decodeURIComponent(raw)) as unknown;
    const result = compositePageKeySchema.safeParse(json);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

const mapAlchemyNetworks = (
  supportedChains: ReadonlyArray<Chains>,
): string[] => {
  return supportedChains
    .map((chain): string | null => {
      if (isAlchemySupportedChain(chain)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return CHAINS_MAP[chain] ?? null;
      }

      return null;
    })
    .filter((c): c is string => !!c);
};

type CreateLoaderArgs = {
  alchemyApiKey: string;
};

export const createLoader = ({ alchemyApiKey }: CreateLoaderArgs) => {
  return async ({
    supportedChains,
    connectedWallets,
    pageParam,
  }: AlchemyRequestParams): Promise<AlchemyResponse> => {
    const networks = mapAlchemyNetworks(supportedChains);
    const hasMonadNetwork = networks.includes(CHAINS_MAP.monad);
    const portfolioNetworks = networks;

    const walletAddresses = Object.values(connectedWallets).filter(
      (walletAddress): walletAddress is string =>
        !!walletAddress && !isTonAddress(walletAddress),
    );

    if (!networks.length || !walletAddresses.length) {
      return {
        pageKey: null,
        data: [],
      };
    }

    const decodedPageKey = pageParam ? decodeCompositePageKey(pageParam) : null;
    const portfolioPageKey = decodedPageKey?.portfolioPageKey ?? null;

    const allTokens: AlchemyBalanceItem[] = [];
    let nextPortfolioPageKey: string | null = null;

    if (portfolioNetworks.length > 0) {
      const response = await alchemyApi.post(
        `/${alchemyApiKey}/assets/tokens/balances/by-address`,
        {
          addresses: walletAddresses.map((address) => ({
            address,
            networks: portfolioNetworks,
            includeErc20Tokens: true,
            includeNativeTokens: true,
          })),
          pageKey: portfolioPageKey,
        },
      );

      const { data } = portfolioResponseSchema.parse(response.data);
      const { tokens, pageKey } = data;

      const filteredTokens = tokens.filter(
        (token) =>
          !(token.network === CHAINS_MAP.monad && token.tokenAddress === null),
      );

      allTokens.push(...(filteredTokens as AlchemyBalanceItem[]));
      nextPortfolioPageKey = pageKey;
    }

    const isFirstPage = pageParam == null;

    if (hasMonadNetwork && isFirstPage) {
      const evmAddresses = walletAddresses.filter(isEvmAddress);

      const monadSettled = await Promise.allSettled(
        evmAddresses.map(async (address) => {
          const response = await alchemyApi.post(
            MONAD_NODE_URL(alchemyApiKey),
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getBalance',
              params: [address, 'latest'],
            },
          );

          const parsed = rpcEthGetBalanceResponseSchema.parse(response.data);
          const nativeBalance = parsed.error ? '0x0' : (parsed.result ?? '0x0');

          const erc20Tokens: AlchemyBalanceItem[] = [];

          // eslint-disable-next-line no-restricted-syntax
          for (const contract of MONAD_ERC20_CONTRACTS) {
            try {
              // eslint-disable-next-line no-await-in-loop
              const erc20Response = await alchemyApi.post(
                MONAD_NODE_URL(alchemyApiKey),
                {
                  jsonrpc: '2.0',
                  id: 1,
                  method: 'eth_call',
                  params: [
                    {
                      to: contract,
                      data: encodeBalanceOfData(address),
                    },
                    'latest',
                  ],
                },
              );

              const erc20Parsed = rpcEthGetBalanceResponseSchema.parse(
                erc20Response.data,
              );

              const erc20Balance = erc20Parsed.error
                ? '0x0'
                : (erc20Parsed.result ?? '0x0');

              erc20Tokens.push({
                network: CHAINS_MAP.monad,
                tokenAddress: contract,
                tokenBalance: erc20Balance,
              });
            } catch {
              // ignore individual token failures
            }
          }

          return {
            address,
            tokens: [
              {
                network: CHAINS_MAP.monad,
                tokenAddress: null,
                tokenBalance: nativeBalance,
              },
              ...erc20Tokens,
            ],
          };
        }),
      );

      monadSettled.forEach((result) => {
        if (result.status === 'fulfilled') {
          allTokens.push(...result.value.tokens);
        }
      });
    }

    const hasNextPage = !!nextPortfolioPageKey;

    const nextPageKey = hasNextPage
      ? encodeCompositePageKey({
          portfolioPageKey: nextPortfolioPageKey,
          monadPageKeys: {},
        })
      : null;

    return {
      data: allTokens,
      pageKey: nextPageKey,
    };
  };
};
