/**
 * What the user can fund a loan with: their wallet's non-zero balances.
 *
 * Two price sources, on purpose:
 * - Balances and the USD value of held assets come from the Intents Connect
 *   SDK hooks (`useWalletBalances`, `useSupportedTokens`), priced by 1Click.
 *   An arbitrary held asset has no Aave oracle price.
 * - Loan figures (borrow amount, max LTV, liquidation price, health) use the
 *   Aave oracle prices in the market snapshot (`useMarketSnapshots`), because
 *   those are what the Pool enforces.
 * The two can disagree slightly; the form's figures are estimates until a
 * quote.
 *
 * Wallet balances only: balances in the NEAR Intents account
 * (`useIntentsBalances`) are left out for now.
 */
import { useCallback, useMemo } from 'react';
import {
  useSupportedTokens,
  useWalletBalances,
} from '@aurora-is-near/intents-connect/react';

import { toFundingAssets } from '@/utils/toFundingAssets';

import type { FundingAssets } from '../types';

const STATUS = {
  idle: 'idle',
  loading: 'loading',
  success: 'ready',
  error: 'error',
} as const;

export const useFundingAssets = (): FundingAssets => {
  const wallet = useWalletBalances();
  const supported = useSupportedTokens();

  // Unknown until the list loads: nothing is marked unavailable meanwhile.
  const origins =
    supported.status === 'success' ? supported.origins : undefined;

  const rows = useMemo(
    () => toFundingAssets(wallet.balances, wallet.tokens, origins),
    [wallet.balances, wallet.tokens, origins],
  );

  const unreadChains = useMemo(
    () => Object.keys(wallet.errors),
    [wallet.errors],
  );

  const { refresh: refreshWallet } = wallet;
  const refresh = useCallback(() => {
    void refreshWallet();
  }, [refreshWallet]);

  return { rows, unreadChains, status: STATUS[wallet.status], refresh };
};
