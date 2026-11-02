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

/** The wallet family whose balances can be read on a chain (phase 1). */
export const getBalanceFamily = (
  chain: string,
): IntentsAccountFamily | undefined => {
  const family = getChainFamily(chain);

  return family === 'stellar' ? undefined : family;
};

/** A chain's gas token: no contract address (native NEAR is synthesised). */
export const isNativeToken = (token: BalanceToken): boolean =>
  token.assetId === NATIVE_NEAR_ASSET_ID ||
  (token.blockchain !== 'near' && !token.contractAddress);

/**
 * Keeps the tokens a phase-1 wallet (EVM, Solana, NEAR) can hold, with
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
