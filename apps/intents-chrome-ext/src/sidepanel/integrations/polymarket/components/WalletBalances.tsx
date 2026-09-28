import { useMemo } from 'react';

import {
  Card,
  getTokenBalanceKey,
  Skeleton,
  TokensList,
  useMergedBalance,
  useTokens,
} from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';

type Props = {
  onSelect: (token: Token) => void;
};

const toUsd = (token: Token, balance: string) =>
  (Number(balance) / 10 ** token.decimals) * token.price;

/**
 * The connected wallet's non-zero balances, loaded by the widget's Alchemy
 * integration. Picking one makes it the deposit's source token.
 */
export const WalletBalances = ({ onSelect }: Props) => {
  const { tokens, isLoading } = useTokens({ variant: 'source' });
  const { mergedBalance } = useMergedBalance();

  const held = useMemo(
    () =>
      tokens
        .filter((token) => !token.isIntent)
        .map((token) => ({
          token,
          balance: mergedBalance[getTokenBalanceKey(token)],
        }))
        .filter(
          (entry): entry is { token: Token; balance: string } =>
            typeof entry.balance === 'string' && entry.balance !== '0',
        )
        .sort((a, b) => toUsd(b.token, b.balance) - toUsd(a.token, a.balance)),
    [tokens, mergedBalance],
  );

  return (
    <Card className="flex flex-col gap-sw-md" padding="none">
      <span className="px-sw-2xl pt-sw-2xl text-sw-label-md text-sw-gray-50">
        Wallet balances
      </span>

      {isLoading && (
        <div className="flex flex-col gap-sw-md px-sw-2xl pb-sw-2xl">
          <Skeleton height={44} />
          <Skeleton height={44} />
        </div>
      )}

      {!isLoading && held.length === 0 && (
        <span className="px-sw-2xl pb-sw-2xl text-sw-body-sm text-sw-gray-400">
          No balances found on supported networks yet.
        </span>
      )}

      {held.length > 0 && (
        <ul className="flex flex-col px-sw-md pb-sw-md">
          {held.map(({ token, balance }) => (
            <TokensList.Item
              key={getTokenBalanceKey(token)}
              token={token}
              balance={balance}
              variant="source"
              onMsg={(msg) => onSelect(msg.token)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
};
