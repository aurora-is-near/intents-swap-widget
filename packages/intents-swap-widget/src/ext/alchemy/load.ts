import { isTonAddress } from '../../utils/ton/isTonAddress';
import { CHAINS_MAP, isAlchemySupportedChain } from './types';
import type {
  AlchemyBalanceItem,
  AlchemyRequestParams,
  AlchemyResponse,
} from './types';
import { alchemyApi } from '@/network';
import type { Chains } from '@/types/chain';

type ResultPage = {
  pageKey: string | null;
  tokens: AlchemyBalanceItem[];
};

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
    connectedWallets,
    pageParam,
  }: AlchemyRequestParams): Promise<AlchemyResponse> => {
    const networks = mapAlchemyNetworks(walletSupportedChains);

    const walletAddresses = Object.values(connectedWallets).filter(
      (walletAddress) => !!walletAddress && !isTonAddress(walletAddress),
    );

    if (!networks.length || !walletAddresses.length) {
      return {
        pageKey: null,
        data: [],
      };
    }

    const { data } = await alchemyApi.post<{ data: ResultPage }>(
      `/${alchemyApiKey}/assets/tokens/balances/by-address${
        pageParam ? `?pageKey=${pageParam}` : ''
      }`,
      {
        addresses: walletAddresses.map((address) => ({
          address,
          networks,
          includeErc20Tokens: true,
          includeNativeTokens: true,
        })),
        pageKey: pageParam,
      },
    );

    const { tokens, pageKey } = data.data;

    return {
      data: tokens,
      pageKey,
    };
  };
};
