import { toQuoteAssetId } from '@aurora-is-near/intents-connect';
import { formatUnits } from 'viem';
import type {
  BalanceToken,
  SupportedToken,
} from '@aurora-is-near/intents-connect';

import type { FundingAsset } from '@/domains/wallet/types';

/** USD value of a smallest-unit amount; `undefined` without a price. */
const usdValue = (
  atomic: bigint,
  decimals: number,
  price: number | undefined,
): number | undefined =>
  price ? Number(formatUnits(atomic, decimals)) * price : undefined;

/**
 * A token from the SDK's list. Its price is typed as always there, but
 * 1Click can leave it out (or send 0): such a token gets no USD value.
 */
export type FundingToken = Omit<BalanceToken, 'price'> & { price?: number };

/** Highest USD value first; unpriced rows last, then by symbol. */
const byValue = (a: FundingAsset, b: FundingAsset) =>
  (b.usdValue ?? -1) - (a.usdValue ?? -1) || a.symbol.localeCompare(b.symbol);

/**
 * Non-zero wallet balances, highest value first. A token Intents Connect
 * can't start from (not among `origins`) is marked unavailable; while
 * `origins` is unknown (`undefined`), nothing is marked. Native NEAR is
 * quoted as wNEAR, so it is checked as that.
 */
export const toFundingAssets = (
  balances: Readonly<Record<string, string>>,
  tokens: readonly FundingToken[],
  origins: readonly SupportedToken[] | undefined,
): FundingAsset[] => {
  const byId = new Map(tokens.map((token) => [token.assetId, token]));
  const payable = origins
    ? new Set(origins.flatMap((token) => token.assetId ?? []))
    : undefined;

  return Object.entries(balances)
    .flatMap(([assetId, raw]): FundingAsset[] => {
      const token = byId.get(assetId);
      const amount = BigInt(raw);

      if (!token || amount <= 0n) {
        return [];
      }

      return [
        {
          assetId,
          symbol: token.symbol,
          chain: token.blockchain,
          decimals: token.decimals,
          contractAddress: token.contractAddress,
          amount,
          usdValue: usdValue(amount, token.decimals, token.price),
          unavailableReason:
            payable && !payable.has(toQuoteAssetId({ assetId }))
              ? 'Not supported yet'
              : undefined,
        },
      ];
    })
    .sort(byValue);
};
