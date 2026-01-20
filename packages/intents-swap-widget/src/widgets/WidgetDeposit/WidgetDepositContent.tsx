import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CommonWidgetProps, TokenInputType } from '../types';
import { useTokenModal } from '../../hooks/useTokenModal';
import { useTypedTranslation } from '../../localisation';
import { WidgetDepositSkeleton } from './WidgetDepositSkeleton';
import {
  DepositMethodSwitcher,
  ExternalDeposit,
  SubmitButton,
  SuccessScreen,
  SwapQuote,
  TokenInput,
  TokensModal,
} from '@/features';

import { Banner, BlockingError } from '@/components';
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
import { isDebug, noop, notReachable } from '@/utils';
import type { ChainsFilters, Token, TransferResult } from '@/types';

export type Msg =
  | { type: 'on_select_token'; token: Token; variant: TokenInputType }
  | { type: 'on_change_deposit_type'; isExternal: boolean }
  | { type: 'on_transfer_success' }
  | { type: 'on_tokens_modal_toggled'; isOpen: boolean };

export type Props = CommonWidgetProps<Msg>;

export const WidgetDepositContent = ({
  onMsg,
  makeTransfer,
  isLoading,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();
  const { isDirectNearTokenWithdrawal } = useComputedSnapshot();
  const {
    chainsFilter: customChainsFilter,
    alchemyApiKey,
    refetchQuoteInterval,
    intentsAccountType,
  } = useConfig();

  const { onChangeAmount, onChangeToken } = useTokenInputPair();
  const { status: tokensStatus, refetch: refetchTokens } = useTokens();
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

  const handleExternalDepositMsg = useCallback(
    (
      msg:
        | { type: 'on_transaction_received' }
        | { type: 'on_successful_transfer'; transferResult: TransferResult },
    ) => {
      switch (msg.type) {
        case 'on_successful_transfer':
          setTransferResult(msg.transferResult);
          break;
        case 'on_transaction_received':
          // Transaction received, no action needed
          break;
        default:
          notReachable(msg);
      }
    },
    [],
  );

  useEffect(() => {
    fireEvent('reset', { clearWalletAddress: true });

    return () => {
      fireEvent('depositTypeSet', { isExternal: false });
    };
  }, []);

  useStoreSideEffects({
    debug: isDebug(),
    listenTo: [
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

  if (!!isLoading || (tokensStatus !== 'error' && !ctx.sourceToken)) {
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
          <div className="gap-sw-2xl flex flex-col">
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
        <div className="gap-sw-2xl flex flex-col">
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

          <DepositMethodSwitcher>
            {({ isExternal }) =>
              isExternal ? (
                <div className="gap-sw-2xl flex flex-col justify-between">
                  <ExternalDeposit onMsg={handleExternalDepositMsg} />
                  {(ctx.state === 'quote_success_internal' ||
                    ctx.state === 'quote_success_external') && (
                    <Banner
                      multiline
                      variant="warn"
                      message="Match the token, amount and network entered above in your wallet. Incorrect values will cause the deposit to fail and be refunded."
                    />
                  )}
                </div>
              ) : null
            }
          </DepositMethodSwitcher>

          {!isDirectNearTokenWithdrawal && <SwapQuote />}

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
