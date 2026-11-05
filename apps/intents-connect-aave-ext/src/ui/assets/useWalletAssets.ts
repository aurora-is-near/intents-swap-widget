import { useMemo } from 'react';
import {
  type BalanceToken,
  NATIVE_NEAR_ASSET_ID,
} from '@aurora-is-near/intents-connect';
import { useWalletBalances } from '@aurora-is-near/intents-connect/react';

import { usdValue } from './amounts';
import { chainLabel } from './tokens';

/** One balance of the paying wallet. */
export type AssetRow = {
  /** 1Click asset id. */
  id: string;
  token: BalanceToken;
  /** Smallest unit. */
  amount: string;
  usd?: number;
  /** Why it can't pay for a supply, if it can't. */
  unavailable?: string;
};

const byValue = (a: AssetRow, b: AssetRow) =>
  (b.usd ?? -1) - (a.usd ?? -1) || a.token.symbol.localeCompare(b.token.symbol);

/**
 * Non-zero balances of the provider's wallet, highest value first, with
 * the chains that couldn't be read.
 */
export const useWalletAssets = () => {
  const wallet = useWalletBalances();

  const rows = useMemo(() => {
    const tokens = new Map(
      wallet.tokens.map((token) => [token.assetId, token]),
    );

    return Object.entries(wallet.balances)
      .flatMap(([id, amount]): AssetRow[] => {
        const token = tokens.get(id);

        return token && BigInt(amount) > 0n
          ? [
              {
                id,
                token,
                amount,
                usd: usdValue(amount, token.decimals, token.price),
                ...(id === NATIVE_NEAR_ASSET_ID && {
                  unavailable: 'Wrap to wNEAR first',
                }),
              },
            ]
          : [];
      })
      .sort(byValue);
  }, [wallet.balances, wallet.tokens]);

  const unreadChains = useMemo(
    () => Object.keys(wallet.errors).map(chainLabel),
    [wallet.errors],
  );

  return {
    rows,
    unreadChains,
    status: wallet.status,
    error: wallet.error,
    refresh: wallet.refresh,
  };
};
