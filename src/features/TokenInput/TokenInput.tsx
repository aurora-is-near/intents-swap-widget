import { useId } from 'react';

import { cn } from '@/utils/cn';
import { noop } from '@/utils/noop';
import { useConfig } from '@/config';

import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { TokenIcon } from '@/components/TokenIcon';
import { InputAmount } from '@/components/InputAmount';
import type { Token, TokenBalance } from '@/types/token';

import { WalletBalance } from './WalletBalance';
import { getBalancePortion } from './utils/getBalancePortion';
import { getUsdDisplayAmount } from './utils/getUsdDisplayAmount';
import { getPercentageDeltaColor } from './utils/getPercentageDeltaColor';

export type Msg =
  | { type: 'on_click_select_token' }
  | { type: 'on_change_amount'; amount: string };

export type Props = {
  token: Token;
  balance: TokenBalance;
  value?: string;
  quoteUsdDelta?: number;
  quoteUsdValue?: number;
  showQuickBalanceActions?: boolean;
  state?: 'default' | 'disabled' | 'error' | 'error-balance';
  onMsg: (msg: Msg) => void;
};

export const TokenInputWithToken = ({
  token,
  balance,
  value = '',
  quoteUsdDelta,
  quoteUsdValue,
  state = 'default',
  showQuickBalanceActions = true,
  onMsg,
}: Props) => {
  const inputName = useId();
  const config = useConfig();

  const usdAmount = getUsdDisplayAmount(token, value, quoteUsdValue);

  const onSetPortionOfBalance = (div: number) => {
    onMsg({
      type: 'on_change_amount',
      amount: getBalancePortion(balance, token.decimals, div),
    });
  };

  return (
    <Card className="gap-sw-2xl flex flex-col">
      <div className="flex items-center justify-between">
        <InputAmount
          value={value}
          name={inputName}
          setValue={noop}
          placeholder="0"
          state={state === 'default' || state === 'disabled' ? state : 'error'}
          onChange={(e) => {
            onMsg({ type: 'on_change_amount', amount: e.target.value });
          }}
        />
        <button
          type="button"
          onClick={
            state === 'disabled'
              ? undefined
              : () => onMsg({ type: 'on_click_select_token' })
          }
          className={cn(
            'gap-sw-md pl-sw-sm pr-sw-md flex h-[36px] min-w-[80px] shrink-0 cursor-pointer items-center rounded-sw-md bg-sw-gray-600',
            { 'animate-pulse cursor-default': state === 'disabled' },
          )}>
          <TokenIcon chainShowIcon={!token.isIntent} {...token} />
          <span className="text-sw-label-m text-sw-gray-50">
            {token.symbol}
          </span>
        </button>
      </div>
      <div className="gap-sw-sm min-h-sw-2xl flex items-center justify-between">
        <div className="gap-sw-md flex items-center">
          <span className="text-sw-label-s text-sw-gray-100">{usdAmount}</span>
          {quoteUsdDelta ? (
            <Badge
              size="sm"
              detail="dimmed"
              isClickable={false}
              variant={getPercentageDeltaColor(quoteUsdDelta)}>
              {`${quoteUsdDelta > 0 ? '+' : ''}${quoteUsdDelta.toFixed(2)}%`}
            </Badge>
          ) : null}
        </div>
        <div className="gap-sw-sm flex items-center">
          {token && !!config.walletAddress && (
            <WalletBalance
              token={token}
              balance={balance}
              isNotSufficient={state === 'error-balance'}
            />
          )}

          {!!balance && showQuickBalanceActions && (
            <>
              <Badge
                isClickable={state !== 'disabled'}
                onClick={() => onSetPortionOfBalance(2)}>
                50%
              </Badge>
              <Badge
                isClickable={state !== 'disabled'}
                onClick={() => onSetPortionOfBalance(1)}>
                Max
              </Badge>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
