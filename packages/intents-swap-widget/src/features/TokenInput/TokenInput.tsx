import { useId } from 'react';

import { WalletBalance } from './WalletBalance';
import { getBalancePortion } from './utils/getBalancePortion';
import { getUsdDisplayAmount } from './utils/getUsdDisplayAmount';
import { getPercentageDeltaColor } from './utils/getPercentageDeltaColor';

import { TokenInputHeading } from './TokenInputHeading';
import { useUnsafeSnapshot } from '../../machine';
import { cn } from '@/utils/cn';
import { noop } from '@/utils/noop';
import { useConfig } from '@/config';
import { useTypedTranslation } from '@/localisation';

import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { TokenIcon } from '@/components/TokenIcon';
import { InputAmount } from '@/components/InputAmount';
import type { Token, TokenBalance } from '@/types/token';

export type Msg =
  | { type: 'on_click_select_token' }
  | { type: 'on_select_token'; token: Token }
  | { type: 'on_change_amount'; amount: string };

export type Props = {
  token: Token;
  balance: TokenBalance;
  value?: string;
  quoteUsdDelta?: number;
  quoteUsdValue?: number;
  showBalance?: boolean;
  showQuickBalanceActions?: boolean;
  state?: 'default' | 'disabled' | 'error' | 'error-balance';
  onMsg: (msg: Msg) => void;
  heading: string;
};

export const TokenInputWithToken = ({
  token,
  balance,
  value = '',
  quoteUsdDelta,
  quoteUsdValue,
  state = 'default',
  showBalance = true,
  showQuickBalanceActions = true,
  heading,
  onMsg,
}: Props) => {
  const inputName = useId();
  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();
  const { hideTokenInputHeadings } = useConfig();

  const usdAmount = getUsdDisplayAmount(token, value, quoteUsdValue);

  const onSetPortionOfBalance = (div: number) => {
    onMsg({
      type: 'on_change_amount',
      amount: getBalancePortion(balance, token.decimals, div),
    });
  };

  return (
    <Card className="flex flex-col">
      {!hideTokenInputHeadings && (
        <TokenInputHeading>{heading}</TokenInputHeading>
      )}
      <div
        className={cn(
          'flex items-center justify-between',
          !hideTokenInputHeadings && 'mt-sw-2xl',
        )}>
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
            'gap-sw-md pl-sw-sm pr-sw-md flex h-[36px] min-w-[80px] shrink-0 cursor-pointer items-center rounded-sw-md bg-sw-gray-600 hover:bg-sw-gray-500 transition-colors',
            {
              'animate-pulse cursor-default': state === 'disabled',
            },
          )}>
          <TokenIcon chainShowIcon={!token.isIntent} {...token} />
          <span className="text-sw-label-m text-sw-gray-50">
            {token.symbol}
          </span>
        </button>
      </div>
      <div className="gap-sw-sm min-h-sw-2xl flex items-center justify-between mt-sw-lg">
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
          {token && !!ctx.walletAddress && showBalance && (
            <WalletBalance
              token={token}
              balance={balance}
              isNotSufficient={state === 'error-balance'}
              onClick={() => onSetPortionOfBalance(1)}
            />
          )}

          {!!balance && showBalance && showQuickBalanceActions && (
            <>
              <Badge
                isClickable={state !== 'disabled'}
                onClick={() => onSetPortionOfBalance(2)}>
                {t('tokens.input.half.label', '50%')}
              </Badge>
              <Badge
                isClickable={state !== 'disabled'}
                onClick={() => onSetPortionOfBalance(1)}>
                {t('tokens.input.max.label', 'Max')}
              </Badge>
            </>
          )}

          {!showBalance && (
            <div className="rounded-full bg-sw-gray-700 py-sw-xs px-sw-sm flex items-center justify-center">
              <span className="text-sw-gray-100 text-label-s">
                {t('tokens.input.externalBalance.label', 'External balance')}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
