import { useMemo } from 'react';

import {
  useTokens,
  useTransactions,
} from '@aurora-is-near/intents-swap-widget';

import { toActivityItem } from './activity';

/**
 * The account's swaps, sends and deposits: the widget's 1Click history for
 * the account's address (made through this app's key), polled while any is
 * pending, plus the optimistic entries the widget adds after a transfer.
 */
export const useActivity = () => {
  const { tokens } = useTokens();
  const history = useTransactions();

  const items = useMemo(
    () => history.transactions.map((tx) => toActivityItem(tokens, tx)),
    [tokens, history.transactions],
  );

  return { ...history, items };
};
