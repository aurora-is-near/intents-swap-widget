import { useMemo } from 'react';
import {
  type BalanceToken,
  NATIVE_NEAR_ASSET_ID,
} from '@aurora-is-near/intents-connect';
import {
  useSupportedTokens,
  useWalletBalances,
} from '@aurora-is-near/intents-connect/react';

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

const unavailableReason = (
  id: string,
  payable: ReadonlySet<string> | undefined,
): string | undefined => {
  if (id === NATIVE_NEAR_ASSET_ID) {
    return 'Wrap to wNEAR first';
  }

  return payable && !payable.has(id) ? 'Not supported yet' : undefined;
};

/**
 * Non-zero balances of the provider's wallet, highest value first, with
 * the chains that couldn't be read. A token Intents Connect can't start
 * from is listed as unavailable.
 */
export const useWalletAssets = () => {
  const wallet = useWalletBalances();
  const supported = useSupportedTokens();

  const rows = useMemo(() => {
    const tokens = new Map(
      wallet.tokens.map((token) => [token.assetId, token]),
    );

    // Unknown until the list loads: nothing is marked meanwhile.
    const payable =
      supported.status === 'success'
        ? new Set(supported.origins.flatMap((token) => token.assetId ?? []))
        : undefined;

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
                unavailable: unavailableReason(id, payable),
              },
            ]
          : [];
      })
      .sort(byValue);
  }, [wallet.balances, wallet.tokens, supported.status, supported.origins]);

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
