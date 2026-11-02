import { useEffect, useRef } from 'react';

import {
  fireEvent,
  isValidChainAddress,
  useStoreSideEffects,
  useTokenInputPair,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import type { ChainsFilter, Token } from '@aurora-is-near/intents-swap-widget';

import type { Account } from '../../accounts/types';
import { sourceKey, useTransferSource } from '../../accounts/useTransferSource';
import type { TransferSource } from '../../accounts/useTransferSource';
import { useAccountAssets } from '../../home/useAccountAssets';

/**
 * Only what the source holds: the primary's intents balance and (for a wallet
 * account) its wallet's tokens; a secondary wallet's tokens.
 */
const sourceFilterOf = (
  source: TransferSource,
  account: Account,
): ChainsFilter => {
  if (source.kind === 'secondary') {
    return { intents: 'none', external: 'with-balance' };
  }

  return {
    intents: 'with-balance',
    external: account.kind === 'wallet' ? 'with-balance' : 'none',
  };
};

/** Whether `token` can be spent from `source`. */
const belongsTo = (
  token: Token | undefined,
  source: TransferSource,
  account: Account,
) => {
  if (!token) {
    return false;
  }

  if (source.kind === 'secondary') {
    return !token.isIntent;
  }

  return token.isIntent || account.kind === 'wallet';
};

/**
 * The widget machine's swap form for a screen: a clean start, the largest
 * holding of the spending source as the token, its balance and quotes.
 * Config, the wallet address and balances are synced app-wide (App).
 *
 * The source — the account's intents balance, its own wallet or a secondary
 * wallet — is the app-wide `TransferSource`; the widget is configured with
 * its wallet, so `assets.wallet` is that wallet's. Switching it clears the
 * token and amount and picks that source's largest holding.
 */
export const useTransferForm = ({
  account,
  preferredSource,
}: {
  account: Account;
  /** Start from this token (e.g. opened from its asset screen). */
  preferredSource?: Token;
}) => {
  const pair = useTokenInputPair();
  const { ctx } = useUnsafeSnapshot();
  const assets = useAccountAssets();
  const { source, wallet, select } = useTransferSource();

  // The widget is configured with the source's wallet, so `assets.wallet`
  // is that wallet's tokens. Account first, as before.
  const spendable =
    source.kind === 'secondary'
      ? assets.wallet
      : [...assets.account, ...assets.wallet];

  const largest = spendable[0]?.token;
  const initial = belongsTo(preferredSource, source, account)
    ? preferredSource
    : largest;

  const isSourceAllowed = belongsTo(ctx.sourceToken, source, account);
  const key = sourceKey(source);

  // An account token opened from its asset screen is spent from the
  // primary, whichever wallet was selected.
  useEffect(() => {
    if (preferredSource?.isIntent && source.kind === 'secondary') {
      select({ kind: 'primary' });
    }
  }, []);

  // The machine's reset keeps a send address equal to the wallet's own (for
  // the widget's "receive in my wallet"); a new form starts without one. The
  // machine fills it in again when the target is on the wallet's chain.
  // The same on switching the source, whose token is dropped for the new
  // source's largest holding — unless the token moved along (a flip).
  const previousKey = useRef(key);
  const keepsToken = useRef(false);

  useEffect(() => {
    const isSwitch = previousKey.current !== key;

    previousKey.current = key;

    if (isSwitch && keepsToken.current) {
      keepsToken.current = false;

      return;
    }

    // A new form starts from its preferred token; a switch keeps the target.
    fireEvent('reset', {
      clearWalletAddress: false,
      keepSelectedTokens: isSwitch,
    });
    fireEvent('addressSet', null);

    if (isSwitch) {
      fireEvent('tokenSelect', { variant: 'source', token: undefined });
    }
  }, [key]);

  /** Switches the source for a token already selected from it (a flip). */
  const changeSourceKeepingToken = (next: TransferSource) => {
    if (sourceKey(next) !== key) {
      keepsToken.current = true;
      select(next);
    }
  };

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
    if (initial && (!ctx.sourceToken || !isSourceAllowed)) {
      fireEvent('tokenSelect', { variant: 'source', token: initial });
    }
  }, [initial, ctx.sourceToken, isSourceAllowed]);

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
    account,
    source,
    /** The wallet the widget spends from; null for the account of a passkey. */
    wallet,
    /** The spending wallet's name; the account's for a passkey. */
    sourceName: wallet?.name ?? account.name,
    sourceFilter: sourceFilterOf(source, account),
    changeSource: select,
    changeSourceKeepingToken,
    isLoading: assets.isLoading,
    /** Nothing to swap or send from this source. */
    isEmpty: !assets.isLoading && spendable.length === 0,
  };
};
