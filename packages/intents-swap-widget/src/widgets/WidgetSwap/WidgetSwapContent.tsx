import { useEffect, useMemo, useState } from 'react';

import type { CommonWidgetProps, TokenInputType } from '../types';
import { useTokenModal } from '../../hooks/useTokenModal';
import { WidgetSwapSkeleton } from './WidgetSwapSkeleton';
import { useTypedTranslation } from '../../localisation';
import {
  SendAddress,
  SubmitButton,
  SuccessScreen,
  SwapDirectionSwitcher,
  SwapQuote,
  TokenInput,
  TokensModal,
} from '@/features';

import { BlockingError } from '@/components';
import { WalletCompatibilityCheck } from '@/features/WalletCompatibilityCheck';

import { useStoreSideEffects } from '@/machine/effects';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine/events/utils/fireEvent';

import {
  useIsCompatibilityCheckRequired,
  useTokenInputPair,
  useTokens,
  useWalletConnection,
} from '@/hooks';
import { useConfig } from '@/config';

import { isDebug, notReachable } from '@/utils';

import type { ChainsFilters, Token, TransferResult } from '@/types';

export type Msg =
  | { type: 'on_tokens_modal_toggled'; isOpen: boolean }
  | { type: 'on_select_token'; token: Token; variant: TokenInputType }
  | { type: 'on_transfer_success' };

export type Props = CommonWidgetProps<Msg>;

export const WidgetSwapContent = ({
  makeTransfer,
  onMsg,
  isLoading,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { isDirectNearTokenWithdrawal } = useComputedSnapshot();
  const {
    chainsFilter: customChainsFilter,
    enableAccountAbstraction,
    alchemyApiKey,
    refetchQuoteInterval,
    intentsAccountType,
  } = useConfig();

  const { t } = useTypedTranslation();
  const { status: tokensStatus, refetch: refetchTokens } = useTokens();
  const { tokenModalOpen, updateTokenModalState } = useTokenModal({ onMsg });
  const { onChangeAmount, onChangeToken, lastChangedInput } =
    useTokenInputPair();

  const { walletSignOut } = useWalletConnection();
  const isCompatibilityCheckRequired = useIsCompatibilityCheckRequired();
  const [isCompatibilityOpen, setIsCompatibilityOpen] = useState(
    isCompatibilityCheckRequired,
  );

  useEffect(() => {
    if (isCompatibilityCheckRequired) {
      setIsCompatibilityOpen(isCompatibilityCheckRequired);
    }
  }, [isCompatibilityCheckRequired]);

  const [transferResult, setTransferResult] = useState<
    TransferResult | undefined
  >();

  useEffect(() => {
    fireEvent('reset', { clearWalletAddress: true });
  }, []);

  const onBackToSwap = () => {
    fireEvent('reset', { clearWalletAddress: false, keepSelectedTokens: true });
  };

  useStoreSideEffects({
    debug: isDebug(),
    listenTo: [
      'checkWalletConnection',
      'setSourceTokenBalance',
      ['setDefaultSelectedTokens', { skipIntents: false }],
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

  const chainsFilters = useMemo((): ChainsFilters => {
    if (customChainsFilter) {
      return customChainsFilter;
    }

    const enabledIntentsFilter = ctx.walletAddress ? 'with-balance' : 'all';

    return {
      source: {
        intents: enableAccountAbstraction ? enabledIntentsFilter : 'none',
        external: ctx.walletAddress ? 'wallet-supported' : 'all',
      },
      target: {
        intents: enableAccountAbstraction ? 'all' : 'none',
        external: 'all',
      },
    };
  }, [customChainsFilter, enableAccountAbstraction, ctx.walletAddress]);

  if (!!isLoading || (tokensStatus !== 'error' && !ctx.sourceToken)) {
    return <WidgetSwapSkeleton />;
  }

  if (isCompatibilityCheckRequired && isCompatibilityOpen) {
    return (
      <WalletCompatibilityCheck
        onMsg={(msg) => {
          switch (msg.type) {
            case 'on_sign_out':
              walletSignOut?.(intentsAccountType);
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
        title={t('transfer.success.swap.title', 'Swap successful')}
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
            showChainsSelector
            variant={tokenModalOpen}
            groupTokens={tokenModalOpen === 'source'}
            chainsFilter={
              tokenModalOpen === 'source'
                ? chainsFilters.source
                : chainsFilters.target
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
        <div className="gap-sw-2xl flex flex-col">
          <div className="gap-[10px] relative flex flex-col">
            <TokenInput.Source
              heading={t('tokenInput.heading.source.swap', 'Sell')}
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

            <SwapDirectionSwitcher />

            <TokenInput.Target
              heading={t('tokenInput.heading.target.swap', 'Buy')}
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
            makeTransfer={makeTransfer}
            label={
              ctx.sourceToken?.isIntent && ctx.targetToken?.isIntent
                ? t('submit.active.swap', 'Swap')
                : t('submit.active.intentsSwap', 'Swap & send')
            }
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
      return <WidgetSwapSkeleton />;
  }
};
