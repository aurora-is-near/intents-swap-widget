import { useMemo } from 'react';
import type { BalanceToken } from '@aurora-is-near/intents-connect';
import {
  useConfidentialBalances,
  useIntentsBalances,
  useWalletBalances,
} from '@aurora-is-near/intents-connect/react';

import { usdValue } from './amounts';
import { type AssetRow, byValue } from './useWalletAssets';

/** A balance on NEAR Intents, public (`useIntentsBalances`) or confidential. */
type IntentsEntry = {
  tokenId: string;
  /** 1Click asset id; the token id when absent. */
  assetId?: string;
  /** Smallest unit. */
  amount: string;
  symbol?: string | null;
  decimals?: number | null;
};

/**
 * Intents balances as asset rows, joined with 1Click's token list for the
 * chain, decimals and price. A token missing from the list can't be quoted:
 * it's listed as unavailable, or left out when its decimals are unknown
 * (its amount couldn't be shown). Zero balances are dropped.
 */
export const intentsRows = (
  source: 'intents' | 'confidential',
  entries: readonly IntentsEntry[],
  tokens: readonly BalanceToken[],
): AssetRow[] => {
  const byId = new Map(tokens.map((token) => [token.assetId, token]));

  return entries
    .flatMap((entry): AssetRow[] => {
      if (!/^\d+$/.test(entry.amount) || BigInt(entry.amount) === 0n) {
        return [];
      }

      const id = entry.assetId ?? entry.tokenId;
      const known = byId.get(id) ?? byId.get(entry.tokenId);

      if (known) {
        return [
          {
            id: known.assetId,
            source,
            tokenId: entry.tokenId,
            token: known,
            amount: entry.amount,
            usd: usdValue(entry.amount, known.decimals, known.price),
          },
        ];
      }

      if (entry.decimals === null || entry.decimals === undefined) {
        return [];
      }

      return [
        {
          id,
          source,
          tokenId: entry.tokenId,
          token: {
            assetId: id,
            symbol: entry.symbol ?? id.split(':').pop() ?? id,
            blockchain: 'near',
            decimals: entry.decimals,
            price: 0,
          },
          amount: entry.amount,
          unavailable: 'Not supported yet',
        },
      ];
    })
    .sort(byValue);
};

/** The 1Click token list, as the wallet balances read it. */
const useTokenList = () => useWalletBalances().tokens;

/** Public balances of the wallet's intents account, as asset rows. */
export const useIntentsAssets = () => {
  const balances = useIntentsBalances();
  const tokens = useTokenList();
  const rows = useMemo(
    () => intentsRows('intents', balances.entries, tokens),
    [balances.entries, tokens],
  );

  return {
    rows,
    status: balances.status,
    error: balances.error,
    refresh: balances.refresh,
  };
};

/**
 * Confidential balances of the wallet's intents account, as asset rows:
 * read only once `useIntentsAuth().authorize()` opened a session.
 */
export const useConfidentialAssets = () => {
  const balances = useConfidentialBalances();
  const tokens = useTokenList();
  const rows = useMemo(
    () =>
      intentsRows(
        'confidential',
        balances.entries.map(({ tokenId, available }) => ({
          tokenId,
          amount: available,
        })),
        tokens,
      ),
    [balances.entries, tokens],
  );

  return {
    rows,
    status: balances.status,
    error: balances.error,
    refresh: balances.refresh,
  };
};
