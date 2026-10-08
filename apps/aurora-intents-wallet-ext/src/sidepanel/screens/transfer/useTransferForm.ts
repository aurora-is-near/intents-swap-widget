import { useEffect } from 'react';

import {
  fireEvent,
  useStoreSideEffects,
  useTokenInputPair,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';

import { useAccountAssets } from '../../home/useAccountAssets';

/**
 * The widget machine's swap form for a screen: a clean start, the account's
 * largest intents holding as the source, its balance and quotes. Config, the
 * account address and wallet balances are synced app-wide (App).
 *
 * Swaps and sends spend the account's intents balance only, so the source is
 * picked here: the widget's own default falls back to a wallet token.
 */
export const useTransferForm = () => {
  const pair = useTokenInputPair();
  const { ctx } = useUnsafeSnapshot();
  const assets = useAccountAssets();
  const largest = assets.account[0]?.token;

  useEffect(() => {
    fireEvent('reset', { clearWalletAddress: false });
  }, []);

  useEffect(() => {
    if (largest && !ctx.sourceToken?.isIntent) {
      fireEvent('tokenSelect', { variant: 'source', token: largest });
    }
  }, [largest, ctx.sourceToken]);

  useStoreSideEffects({
    listenTo: [
      'updateBalances',
      'setSourceTokenBalance',
      [
        'makeQuote',
        {
          type: pair.lastChangedInput === 'target' ? 'exact_out' : 'exact_in',
        },
      ],
    ],
  });

  return {
    ...pair,
    isLoading: assets.isLoading,
    /** Nothing in the account to swap or send. */
    isEmpty: !assets.isLoading && assets.account.length === 0,
  };
};
