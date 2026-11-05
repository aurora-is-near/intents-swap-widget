import type { IntentsAccountFamily } from '@/account';
import type { BalanceToken } from '@/balances/types';
import { getChainFamily } from '@/chains';
import type { IntentsApi, IntentsApiToken } from '@/intentsApi/types';

/**
 * Asset id of native NEAR. The token list only carries wNEAR (`wrap.near`);
 * native NEAR is synthesised from it, as the widget does, because a NEAR
 * wallet holds both.
 */
export const NATIVE_NEAR_ASSET_ID = 'native-near';

const WNEAR_ASSET_ID = 'nep141:wrap.near';

/**
 * The asset id a quote takes for a balance token: native NEAR is quoted as
 * wNEAR (1Click has no native NEAR asset), and its deposit wraps it on the
 * way. Every other token is quoted as itself.
 */
export const toQuoteAssetId = ({ assetId }: Pick<BalanceToken, 'assetId'>) =>
  assetId === NATIVE_NEAR_ASSET_ID ? WNEAR_ASSET_ID : assetId;

/** The wallet family whose balances can be read on a chain. */
export const getBalanceFamily = (
  chain: string,
): IntentsAccountFamily | undefined => getChainFamily(chain);

/** A chain's gas token: no contract address (native NEAR is synthesised). */
export const isNativeToken = (token: BalanceToken): boolean =>
  token.assetId === NATIVE_NEAR_ASSET_ID ||
  (token.blockchain !== 'near' && !token.contractAddress);

/**
 * Keeps the tokens a supported wallet (EVM, Solana, NEAR, Stellar) can hold, with
 * lower-cased chain slugs, and adds native NEAR next to wNEAR.
 */
export const normalizeTokens = (
  tokens: readonly IntentsApiToken[],
): BalanceToken[] => {
  const result: BalanceToken[] = [];

  tokens.forEach((token) => {
    const blockchain = token.blockchain.toLowerCase();

    if (!getBalanceFamily(blockchain)) {
      return;
    }

    result.push({
      assetId: token.assetId,
      symbol: token.symbol,
      blockchain,
      decimals: token.decimals,
      contractAddress: token.contractAddress,
      price: token.price,
    });

    if (token.assetId === WNEAR_ASSET_ID) {
      result.push({
        assetId: NATIVE_NEAR_ASSET_ID,
        symbol: 'NEAR',
        blockchain: 'near',
        decimals: 24,
        contractAddress: undefined,
        price: token.price,
      });
    }
  });

  return result;
};

/** The intents API's token list, ready for `getWalletBalances`. */
export const getTokens = async (
  intentsApi: Pick<IntentsApi, 'getTokens'>,
): Promise<BalanceToken[]> =>
  normalizeTokens((await intentsApi.getTokens()).tokens);
