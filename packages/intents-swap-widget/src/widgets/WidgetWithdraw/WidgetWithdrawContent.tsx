import { useEffect, useState } from 'react';

import type { CommonWidgetProps, TokenInputType } from '../types';
import { useTokenModal } from '../../hooks/useTokenModal';
import { WidgetWithdrawSkeleton } from './WidgetWithdrawSkeleton';
import { useTypedTranslation } from '../../localisation';
import {
  SendAddress,
  SubmitButton,
  SuccessScreen,
  SwapQuote,
  TokenInput,
  TokensModal,
} from '@/features';

import { BlockingError, Card, DirectionSwitcher } from '@/components';
import { WalletCompatibilityCheck } from '@/features/WalletCompatibilityCheck';

import { useStoreSideEffects } from '@/machine/effects';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine/events/utils/fireEvent';

import {
  useIsCompatibilityCheckRequired,
  useTokenInputPair,
  useTokens,
} from '@/hooks';
import { useConfig } from '@/config';

import { isDebug, notReachable } from '@/utils';

import type { Token, TransferResult } from '@/types';

export type Msg =
  | { type: 'on_select_token'; token: Token; variant: TokenInputType }
  | { type: 'on_transfer_success' }
  | { type: 'on_tokens_modal_toggled'; isOpen: boolean };

export type Props = CommonWidgetProps<Msg>;

export const WidgetWithdrawContent = ({
  providers,
  makeTransfer,
  onMsg,
  isLoading,
}: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { isDirectNearTokenWithdrawal } = useComputedSnapshot();
  const {
    alchemyApiKey,
    refetchQuoteInterval,
    intentsAccountType,
    onWalletSignout,
  } = useConfig();

  const { status: tokensStatus, refetch: refetchTokens } = useTokens();
  const { tokenModalOpen, updateTokenModalState } = useTokenModal({ onMsg });
  const { onChangeAmount, onChangeToken, lastChangedInput } =
    useTokenInputPair();

  const isCompatibilityCheckRequired = useIsCompatibilityCheckRequired();
  const [isCompatibilityOpen, setIsCompatibilityOpen] = useState(false);

  useEffect(() => {
    if (isCompatibilityCheckRequired) {
      setIsCompatibilityOpen(true);
    }
  }, [isCompatibilityCheckRequired]);

  const [transferResult, setTransferResult] = useState<
    TransferResult | undefined
  >();

  useEffect(() => {
    fireEvent('reset', { clearWalletAddress: true });
  }, []);

  useStoreSideEffects({
    debug: isDebug(),
    listenTo: [
      'checkWalletConnection',
      'setSourceTokenBalance',
      [
        'setDefaultSelectedTokens',
        { skipIntents: false, target: 'same-asset' },
      ],
      [
        'makeQuote',
        {
          message: undefined,
          type: lastChangedInput === 'target' ? 'exact_out' : 'exact_in',
          refetchQuoteInterval,
        },
      ],
      ['setBalancesUsingAlchemyExt', { alchemyApiKey }],
    ],
  });

  const onBackToSwap = () => {
    fireEvent('reset', { clearWalletAddress: false, keepSelectedTokens: true });
  };

  if (!!isLoading || (tokensStatus !== 'error' && !ctx.sourceToken)) {
    return <WidgetWithdrawSkeleton />;
  }

  if (isCompatibilityOpen) {
    return (
      <WalletCompatibilityCheck
        providers={providers}
        onMsg={(msg) => {
          switch (msg.type) {
            case 'on_sign_out':
              onWalletSignout?.(intentsAccountType);
              setIsCompatibilityOpen(false);
              break;
            case 'on_close':
              setIsCompatibilityOpen(false);
              break;
            default:
              notReachable(msg.type);
          }
        }}
      />
    );
  }

  if (ctx.state === 'transfer_success' && !!transferResult) {
    return (
      <SuccessScreen
        showTargetToken
        title={t('transfer.success.withdrawal.title', 'Withdrawal successful')}
        {...transferResult}
        onMsg={(msg) => {
          switch (msg.type) {
            case 'on_dismiss_success':
              setTransferResult(undefined);
              onBackToSwap();
              break;
            default:
              notReachable(msg.type);
          }
        }}
      />
    );
  }

  switch (tokensStatus) {
    case 'error':
      return (
        <BlockingError
          message="Couldn't load tokens list."
          onClickRetry={refetchTokens}
        />
      );

    case 'success': {
      if (tokenModalOpen !== 'none') {
        return (
          <TokensModal
            showBalances
            variant={tokenModalOpen}
            showChainsSelector={tokenModalOpen === 'target'}
            groupTokens={false}
            chainsFilter={
              tokenModalOpen === 'source'
                ? {
                    intents: 'with-balance',
                    external: 'none',
                  }
                : { intents: 'none', external: 'all' }
            }
            onMsg={(msg) => {
              switch (msg.type) {
                case 'on_select_token':
                  onChangeToken(tokenModalOpen, msg.token);
                  updateTokenModalState('none');
                  onMsg?.({
                    type: msg.type,
                    token: msg.token,
                    variant: tokenModalOpen,
                  });
                  break;
                case 'on_dismiss_tokens_modal':
                  updateTokenModalState('none');
                  break;
                default:
                  notReachable(msg);
              }
            }}
          />
        );
      }

      return (
        <div className="gap-sw-2xl relative flex flex-col">
          <div className="gap-[10px] relative flex flex-col">
            <Card padding="none">
              <TokenInput.Source
                heading={t(
                  'tokenInput.heading.source.withdraw',
                  'Withdraw token',
                )}
                isChanging={lastChangedInput === 'source'}
                onMsg={(msg) => {
                  switch (msg.type) {
                    case 'on_select_token':
                      onChangeToken('source', msg.token);
                      break;
                    case 'on_change_amount':
                      onChangeAmount('source', msg.amount);
                      break;
                    case 'on_click_select_token':
                      updateTokenModalState('source');
                      break;
                    default:
                      notReachable(msg);
                  }
                }}
              />
            </Card>

            <DirectionSwitcher isEnabled={false} />

            <Card padding="none">
              <TokenInput.Target
                heading={t(
                  'tokenInput.heading.target.withdraw',
                  'Receive token',
                )}
                isChanging={lastChangedInput === 'target'}
                onMsg={(msg) => {
                  switch (msg.type) {
                    case 'on_select_token':
                      onChangeToken('target', msg.token);
                      break;
                    case 'on_change_amount':
                      onChangeAmount('target', msg.amount);
                      break;
                    case 'on_click_select_token':
                      updateTokenModalState('target');
                      break;
                    default:
                      notReachable(msg);
                  }
                }}
              />
            </Card>
          </div>

          {!!ctx.walletAddress &&
            ctx.targetToken &&
            !ctx.targetToken.isIntent && (
              <SendAddress
                onMsg={(msg) => {
                  switch (msg.type) {
                    case 'on_change_send_address':
                      break;
                    default:
                      notReachable(msg.type, { throwError: false });
                  }
                }}
              />
            )}

          {!isDirectNearTokenWithdrawal && <SwapQuote />}

          <SubmitButton
            providers={providers}
            makeTransfer={makeTransfer}
            label={t('submit.active.withdraw', 'Swap & withdraw')}
            onSuccess={(transfer) => {
              setTransferResult(transfer);
              onMsg?.({ type: 'on_transfer_success' });
            }}
          />
        </div>
      );
    }

    case 'pending':
    default:
      return <WidgetWithdrawSkeleton />;
  }
};
