import { useMemo } from 'react';

import {
  useTokens,
  useTransactions,
} from '@aurora-is-near/intents-swap-widget';

import { getAccountIntentsId } from '../accounts/intentsAccountId';
import { useAccounts } from '../accounts/useAccounts';
import type { Account } from '../accounts/types';
import { toActivityItem } from './activity';

/** What the widget's history is keyed by: the wallet address, or the passkey's ID. */
const historyAddress = (account: Account) =>
  account.kind === 'wallet' ? account.address : getAccountIntentsId(account);

/**
 * The account's swaps, sends and deposits: the widget's 1Click history for
 * the account's address (made through this app's key), polled while any is
 * pending, plus the optimistic entries the widget adds after a transfer.
 * Always the account's, whichever of its wallets the widget is set to.
 */
export const useActivity = () => {
  const { active } = useAccounts();
  const { tokens } = useTokens();
  const history = useTransactions({
    walletAddress: active ? historyAddress(active) : undefined,
  });

  const items = useMemo(
    () => history.transactions.map((tx) => toActivityItem(tokens, tx)),
    [tokens, history.transactions],
  );

  return { ...history, items };
};
