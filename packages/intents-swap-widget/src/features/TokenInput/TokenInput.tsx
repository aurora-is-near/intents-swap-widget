import { useId } from 'react';

import { WalletBalance } from './WalletBalance';
import { getBalancePortion } from './utils/getBalancePortion';
import { getUsdDisplayAmount } from './utils/getUsdDisplayAmount';

import { TokenInputHeading } from './TokenInputHeading';
import { useUnsafeSnapshot } from '../../machine';
import { useSupportedChains } from '../../hooks/useSupportedChains';
import { cn } from '@/utils/cn';
import { noop } from '@/utils/noop';
import { useConfig } from '@/config';
import { useTypedTranslation } from '@/localisation';

import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { InputAmount } from '@/components/InputAmount';
import { TokenSelectButton } from '@/components/TokenSelectButton';
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
  const { supportedChains } = useSupportedChains();

  const usdAmount = getUsdDisplayAmount(token, value, quoteUsdValue);

  const onSetPortionOfBalance = (div: number) => {
    onMsg({
      type: 'on_change_amount',
      amount: getBalancePortion(balance, token.decimals, div),
    });
  };

  return (
    <Card className="flex flex-col" aria-label={heading}>
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
        <TokenSelectButton
          token={token}
          state={state === 'disabled' ? 'disabled' : 'default'}
          onClick={() => onMsg({ type: 'on_click_select_token' })}
        />
      </div>
      <div className="gap-sw-sm min-h-sw-2xl flex items-center justify-between mt-sw-lg">
        <div className="gap-sw-md flex items-center">
          <span className="text-sw-label-sm text-sw-gray-100">{usdAmount}</span>
          {quoteUsdDelta ? (
            <span
              className={cn('text-sw-label-sm text-nowrap', {
                'text-sw-gray-400': quoteUsdDelta >= -2 && quoteUsdDelta <= 2,
                'text-sw-status-success': quoteUsdDelta > 2,
                'text-sw-status-error': quoteUsdDelta <= -5,
                'text-sw-status-warning':
                  quoteUsdDelta < -2 && quoteUsdDelta > -5,
              })}>
              {`${quoteUsdDelta > 0 ? '+' : ''}${quoteUsdDelta.toFixed(2)}%`}
            </span>
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
            <span
              className="text-sw-gray-200 text-sw-label-sm"
              style={{ borderBottomWidth: '2px', borderStyle: 'dotted' }}>
              {supportedChains.includes(token.blockchain)
                ? t('tokens.input.externalBalance.label', 'External balance')
                : t(
                    'tokens.input.externalBalanceOnly.label',
                    'External balance only',
                  )}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
