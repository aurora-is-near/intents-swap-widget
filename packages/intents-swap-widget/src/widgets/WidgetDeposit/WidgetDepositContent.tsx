import { useEffect, useMemo, useState } from 'react';

import type { CommonWidgetProps, TokenInputType } from '../types';
import { useTokenModal } from '../../hooks/useTokenModal';
import { useTypedTranslation } from '../../localisation';
import { WidgetDepositSkeleton } from './WidgetDepositSkeleton';
import {
  DepositMethodSwitcher,
  DepositSummary,
  SubmitButton,
  SuccessScreen,
  TokenInput,
  TokensModal,
} from '@/features';
import { WalletCompatibilityCheck } from '@/features/WalletCompatibilityCheck';
import { BalancesUpdateProvider } from '@/context/BalancesUpdateContext';
import { BlockingError } from '@/components';

import { useUnsafeSnapshot } from '@/machine/snap';
import { useStoreSideEffects } from '@/machine/effects';
import { fireEvent } from '@/machine/events/utils/fireEvent';

import {
  useIntentsAccountType,
  useIsCompatibilityCheckRequired,
  useTokenInputPair,
  useTokens,
  useWalletConnection,
} from '@/hooks';

import { useConfig } from '@/config';
import { isDebug, noop, notReachable } from '@/utils';
import type { ChainsFilters, Token, TransferResult } from '@/types';

export type Msg =
  | { type: 'on_select_token'; token: Token; variant: TokenInputType }
  | { type: 'on_change_deposit_type'; isExternal: boolean }
  | { type: 'on_transfer_success' }
  | { type: 'on_tokens_modal_toggled'; isOpen: boolean };

export type Props = CommonWidgetProps<Msg>;

const WidgetDepositContentInner = ({
  onMsg,
  makeTransfer,
  isLoading,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();

  const {
    chainsFilter: customChainsFilter,
    alchemyApiKey,
    refetchQuoteInterval,
  } = useConfig();

  const { intentsAccountType } = useIntentsAccountType();
  const { onChangeAmount, onChangeToken } = useTokenInputPair();
  const {
    status: tokensStatus,
    refetch: refetchTokens,
    isLoading: isLoadingTokens,
  } = useTokens();

  const { tokenModalOpen, updateTokenModalState } = useTokenModal({ onMsg });
  const { walletSignOut } = useWalletConnection();

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

    return () => {
      fireEvent('depositTypeSet', { isExternal: false });
    };
  }, []);

  useStoreSideEffects({
    debug: isDebug(),
    listenTo: [
      'updateBalances',
      'checkWalletConnection',
      'setSourceTokenBalance',
      'setSourceTokenIntentsTarget',
      ['setDefaultSelectedTokens', { skipIntents: true }],
      ['makeQuote', { message: undefined, refetchQuoteInterval }],
      ['setBalancesUsingAlchemyExt', { alchemyApiKey }],
    ],
  });

  useEffect(() => {
    onMsg?.({
      type: 'on_change_deposit_type',
      isExternal: ctx.isDepositFromExternalWallet,
    });
  }, [ctx.isDepositFromExternalWallet]);

  const chainsFilters = useMemo((): ChainsFilters => {
    if (customChainsFilter) {
      return customChainsFilter;
    }

    return {
      source: {
        intents: 'none',
        external: ctx.isDepositFromExternalWallet ? 'all' : 'wallet-supported',
      },
      target: { intents: 'all', external: 'none' },
    };
  }, [customChainsFilter, ctx.isDepositFromExternalWallet]);

  const onBackToSwap = () => {
    fireEvent('reset', { clearWalletAddress: false, keepSelectedTokens: true });
  };

  if (!!isLoading || isLoadingTokens) {
    return <WidgetDepositSkeleton />;
  }

  if (isCompatibilityOpen) {
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
        {...transferResult}
        title={t('transfer.success.deposit.title', 'Deposit successful')}
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

      if (!ctx.walletAddress) {
        return (
          <div className="gap-sw-lg flex flex-col w-full">
            <TokenInput.Source
              showBalance
              heading={t('tokenInput.heading.source.deposit', 'Sell')}
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

            <SubmitButton
              makeTransfer={makeTransfer}
              label={t(
                'submit.active.deposit',
                'Confirm deposit in your wallet',
              )}
              onSuccess={noop}
            />
          </div>
        );
      }

      return (
        <div className="gap-sw-lg flex flex-col w-full">
          {ctx.isDepositFromExternalWallet ? null : (
            <TokenInput.Source
              showBalance={!ctx.isDepositFromExternalWallet}
              heading={t('tokenInput.heading.source.deposit', 'Sell')}
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
          )}

          <DepositMethodSwitcher
            onMsg={(msg) => {
              switch (msg.type) {
                case 'on_toggle_tokens_modal':
                  updateTokenModalState(msg.isOpen ? 'source' : 'none');
                  break;
                case 'on_successful_transfer':
                  setTransferResult(msg.transferResult);
                  break;
                case 'on_transaction_received':
                  // Transaction received, no action needed
                  break;
                default:
                  notReachable(msg);
              }
            }}
          />

          {!!ctx.walletAddress && <DepositSummary />}

          <SubmitButton
            makeTransfer={makeTransfer}
            label={t('submit.active.deposit', 'Confirm deposit in your wallet')}
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
      return <WidgetDepositSkeleton />;
  }
};

export const WidgetDepositContent = (props: Props) => (
  <BalancesUpdateProvider>
    <WidgetDepositContentInner {...props} />
  </BalancesUpdateProvider>
);
