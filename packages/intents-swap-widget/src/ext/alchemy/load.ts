import { z } from 'zod';

import { alchemyApi } from '@/network';
import type { Chains } from '@/types/chain';
import { isEvmAddress } from '../../utils/chains/isEvmAddress';
import { isSolanaAddress } from '../../utils/chains/isSolanaAddress';
import { CHAINS_MAP, isAlchemySupportedChain } from './types';
import type {
  AlchemyBalanceItem,
  AlchemyRequestParams,
  AlchemyResponse,
} from './types';

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
  const selector = '70a08231'; // as: keccak256('balanceOf(address)').slice(0, 8)
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

// Alchemy indexes EVM and Solana only, so each address is queried on the
// networks of its own chain family.
const getAddressNetworks = (address: string, networks: string[]): string[] => {
  if (isEvmAddress(address)) {
    return networks.filter((network) => network !== CHAINS_MAP.sol);
  }

  if (isSolanaAddress(address)) {
    return networks.filter((network) => network === CHAINS_MAP.sol);
  }

  return [];
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

    const walletAddresses = [
      ...new Set(
        Object.values(connectedWallets).filter(
          (walletAddress): walletAddress is string => !!walletAddress,
        ),
      ),
    ];

    const portfolioPairs = walletAddresses
      .map((address) => ({
        address,
        networks: getAddressNetworks(address, networks),
      }))
      .filter((pair) => pair.networks.length > 0);

    if (!portfolioPairs.length) {
      return {
        pageKey: null,
        data: [],
      };
    }

    const decodedPageKey = pageParam ? decodeCompositePageKey(pageParam) : null;
    const portfolioPageKey = decodedPageKey?.portfolioPageKey ?? null;

    const allTokens: AlchemyBalanceItem[] = [];

    const portfolioResponse = await alchemyApi.post(
      `/${alchemyApiKey}/assets/tokens/balances/by-address`,
      {
        includeErc20Tokens: true,
        includeNativeTokens: true,
        addresses: portfolioPairs,
        pageKey: portfolioPageKey,
      },
    );

    const { data } = portfolioResponseSchema.parse(portfolioResponse.data);
    const { tokens, pageKey: nextPortfolioPageKey } = data;

    const filteredTokens = tokens.filter((token) => {
      const isMonad = token.network === CHAINS_MAP.monad;
      const isNativeMonad = isMonad && token.tokenAddress === null;
      const isMonadErc20ManuallyLoaded =
        isMonad &&
        token.tokenAddress != null &&
        MONAD_ERC20_CONTRACTS.some(
          (addr) => addr.toLowerCase() === token.tokenAddress?.toLowerCase(),
        );

      // Exclude native MON and Monad ERC20s we load via direct RPC
      return !(isNativeMonad || isMonadErc20ManuallyLoaded);
    });

    allTokens.push(...(filteredTokens as AlchemyBalanceItem[]));

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
