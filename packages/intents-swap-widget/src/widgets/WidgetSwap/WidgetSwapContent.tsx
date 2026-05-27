import { useEffect, useMemo, useState } from 'react';

import {
  ChainNotSupportedModal,
  SendAddress,
  SubmitButton,
  SuccessScreen,
  SwapDirectionSwitcher,
  SwapQuote,
  TokenInput,
  TokensModal,
} from '@/features';
import {
  useIsCompatibilityCheckRequired,
  useTokenInputPair,
  useTokens,
  useUnsupportedChain,
  useWalletConnection,
} from '@/hooks';
import { useConfig } from '@/config';
import { BlockingError } from '@/components';
import { isDebug, notReachable } from '@/utils';
import { useUnsafeSnapshot } from '@/machine/snap';
import { useStoreSideEffects } from '@/machine/effects';
import { fireEvent } from '@/machine/events/utils/fireEvent';
import { WalletCompatibilityCheck } from '@/features/WalletCompatibilityCheck';
import type { ChainsFilters, Token, TransferResult } from '@/types';

import { useTypedTranslation } from '../../localisation';
import { useTokenModal } from '../../hooks/useTokenModal';
import { useIntentsAccountType } from '../../hooks/useIntentsAccountType';
import type { CommonWidgetProps, TokenInputType } from '../types';

import { WidgetSwapSkeleton } from './WidgetSwapSkeleton';

export type Msg =
  | { type: 'on_tokens_modal_toggled'; isOpen: boolean }
  | { type: 'on_select_token'; token: Token; variant: TokenInputType }
  | ({ type: 'on_transfer_success' } & TransferResult);

export type Props = CommonWidgetProps<Msg>;

export const WidgetSwapContent = ({
  isLoading,
  makeTransfer,
  onMsg,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { intentsAccountType } = useIntentsAccountType();
  const {
    chainsFilter: customChainsFilter,
    enableAccountAbstraction,
    alchemyApiKey,
    refetchQuoteInterval,
  } = useConfig();

  const { t } = useTypedTranslation();
  const {
    status: tokensStatus,
    refetch: refetchTokens,
    isLoading: isLoadingTokens,
  } = useTokens();

  const { tokenModalOpen, updateTokenModalState } = useTokenModal({ onMsg });
  const { onChangeAmount, onChangeToken, lastChangedInput } =
    useTokenInputPair();

  const { walletSignOut } = useWalletConnection();
  const { unsupportedChain } = useUnsupportedChain();
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
      'updateBalances',
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

  if (!!isLoading || isLoadingTokens) {
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
        transactionType="SWAP"
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

  if (unsupportedChain) {
    return <ChainNotSupportedModal />;
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
        <div className="gap-sw-lg flex flex-col w-full">
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
            !ctx.targetToken.isIntent && <SendAddress />}

          {ctx.sourceToken && <SwapQuote />}

          <SubmitButton
            makeTransfer={makeTransfer}
            label={
              ctx.sourceToken?.isIntent && ctx.targetToken?.isIntent
                ? t('submit.active.swap', 'Swap')
                : t('submit.active.intentsSwap', 'Swap & send')
            }
            onSuccess={(transfer) => {
              setTransferResult(transfer);
              onMsg?.({ type: 'on_transfer_success', ...transfer });
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
