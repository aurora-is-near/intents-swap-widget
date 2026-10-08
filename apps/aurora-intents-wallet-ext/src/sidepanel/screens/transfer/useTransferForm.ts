import { useEffect } from 'react';

import {
  fireEvent,
  useStoreSideEffects,
  useTokenInputPair,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';

import { useAccountAssets } from '../../home/useAccountAssets';

/**
 * The widget machine's swap form for a screen: a clean start, the largest
 * holding as the source, its balance and quotes. Config, the account address
 * and wallet balances are synced app-wide (App).
 *
 * The source is the account's intents balance and, with `fromWallet`, the
 * connected wallet's tokens too (account first). It's picked here because the
 * widget's own default doesn't know which of the two a screen spends.
 */
export const useTransferForm = ({ fromWallet }: { fromWallet: boolean }) => {
  const pair = useTokenInputPair();
  const { ctx } = useUnsafeSnapshot();
  const assets = useAccountAssets();
  const spendable = fromWallet
    ? [...assets.account, ...assets.wallet]
    : assets.account;

  const largest = spendable[0]?.token;
  const isSourceAllowed = !!ctx.sourceToken?.isIntent || fromWallet;

  useEffect(() => {
    fireEvent('reset', { clearWalletAddress: false });
  }, []);

  useEffect(() => {
    if (largest && (!ctx.sourceToken || !isSourceAllowed)) {
      fireEvent('tokenSelect', { variant: 'source', token: largest });
    }
  }, [largest, ctx.sourceToken, isSourceAllowed]);

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
    /** Nothing to swap or send. */
    isEmpty: !assets.isLoading && spendable.length === 0,
  };
};
