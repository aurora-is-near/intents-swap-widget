import { useEffect } from 'react';

import {
  fireEvent,
  isValidChainAddress,
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

  // The machine's reset keeps a send address equal to the wallet's own (for
  // the widget's "receive in my wallet"); a new form starts without one. The
  // machine fills it in again when the target is on the wallet's chain.
  useEffect(() => {
    fireEvent('reset', { clearWalletAddress: false });
    fireEvent('addressSet', null);
  }, []);

  // That auto-filled own address stays when the target moves to a chain it
  // isn't valid on (EVM to NEAR, say): drop it there.
  const targetChain = ctx.targetToken?.isIntent
    ? undefined
    : ctx.targetToken?.blockchain;

  useEffect(() => {
    if (
      targetChain &&
      ctx.sendAddress &&
      ctx.sendAddress === ctx.walletAddress &&
      isValidChainAddress(targetChain, ctx.sendAddress) === false
    ) {
      fireEvent('addressSet', null);
    }
  }, [targetChain, ctx.sendAddress, ctx.walletAddress]);

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
