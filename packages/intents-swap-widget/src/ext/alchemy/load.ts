import { CHAINS_MAP, isAlchemySupportedChain } from './types';
import type {
  AlchemyBalanceItem,
  AlchemyRequestParams,
  AlchemyResponse,
} from './types';
import { createNetworkClient } from '@/network';
import type { Chains } from '@/types/chain';

type ResultPage = {
  pageKey: string | null;
  tokens: AlchemyBalanceItem[];
};

const alchemyApi = createNetworkClient({
  baseURL: 'https://api.g.alchemy.com/data/v1',
});

const mapAlchemyNetworks = (
  walletSupportedChains: ReadonlyArray<Chains>,
): string[] => {
  return walletSupportedChains
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
    walletSupportedChains,
    walletAddress,
    pageParam,
  }: AlchemyRequestParams): Promise<AlchemyResponse> => {
    const networks = mapAlchemyNetworks(walletSupportedChains);

    if (networks.length === 0) {
      return {
        pageKey: null,
        data: [],
      };
    }

    const { data } = await alchemyApi.post<{ data: ResultPage }>(
      `/${alchemyApiKey}/assets/tokens/balances/by-address${pageParam ? `?pageKey=${pageParam}` : ''}`,
      {
        addresses: [
          {
            networks,
            address: walletAddress,
            includeErc20Tokens: true,
            includeNativeTokens: true,
          },
        ],
        pageKey: pageParam,
      },
    );

    return {
      pageKey: data.data.pageKey ?? null,
      data: data.data.tokens || [],
    };
  };
};
