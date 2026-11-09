import { useMemo } from 'react';
import {
  type BalanceToken,
  toQuoteAssetId,
} from '@aurora-is-near/intents-connect';
import {
  useSupportedTokens,
  useWalletBalances,
} from '@aurora-is-near/intents-connect/react';

import { usdValue } from './amounts';
import { chainLabel } from './tokens';

/**
 * Where a balance is held: on the wallet's own chains, or in its intents
 * account on NEAR Intents, publicly or confidentially.
 */
export type BalanceSource = 'wallet' | 'intents' | 'confidential';

/** One balance the user can pay with. */
export type AssetRow = {
  /** 1Click asset id. */
  id: string;
  source: BalanceSource;
  /** The intents token id (`nep141:…`), for an intents or confidential row. */
  tokenId?: string;
  token: BalanceToken;
  /** Smallest unit. */
  amount: string;
  usd?: number;
  /** Why it can't pay for a supply, if it can't. */
  unavailable?: string;
};

export const byValue = (a: AssetRow, b: AssetRow) =>
  (b.usd ?? -1) - (a.usd ?? -1) || a.token.symbol.localeCompare(b.token.symbol);

// Native NEAR is quoted as wNEAR, and its deposit wraps it.
const unavailableReason = (
  id: string,
  payable: ReadonlySet<string> | undefined,
): string | undefined =>
  payable && !payable.has(toQuoteAssetId({ assetId: id }))
    ? 'Not supported yet'
    : undefined;

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
                source: 'wallet',
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
