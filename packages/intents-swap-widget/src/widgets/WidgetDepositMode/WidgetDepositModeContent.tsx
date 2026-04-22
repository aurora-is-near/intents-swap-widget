import { useEffect, useMemo, useState } from 'react';

import { useTypedTranslation } from '../../localisation';
import { useTokenModal } from '../../hooks/useTokenModal';
import type { CommonWidgetProps, TokenInputType } from '../types';

import { WidgetDepositModeSkeleton } from './WidgetDepositModeSkeleton';

import {
  DepositMethodSwitcher,
  DepositSummary,
  SubmitButton,
  SuccessScreen,
  TokenInput,
  TokensModal,
} from '@/features';
import { useConfig } from '@/config';
import { BlockingError } from '@/components';
import { useUnsafeSnapshot } from '@/machine/snap';
import { isDebug, noop, notReachable } from '@/utils';
import { useTokenInputPair, useTokens } from '@/hooks';
import { useStoreSideEffects } from '@/machine/effects';
import { fireEvent } from '@/machine/events/utils/fireEvent';
import { isValidChainAddress } from '@/utils/checkers/isValidChainAddress';
import type { ChainsFilters, Token, TransferResult } from '@/types';

export type Msg =
  | { type: 'on_select_token'; token: Token; variant: TokenInputType }
  | { type: 'on_change_deposit_type'; isExternal: boolean }
  | { type: 'on_transfer_success' }
  | { type: 'on_tokens_modal_toggled'; isOpen: boolean };

export type Props = CommonWidgetProps<Msg>;

const compareTokenSymbols = (symbolA?: string, symbolB?: string) => {
  if (!symbolA || !symbolB) {
    return false;
  }

  if (symbolA.toLowerCase() === 'wnear') {
    return ['near', 'wnear'].includes(symbolB.toLowerCase());
  }

  if (symbolB.toLowerCase() === 'wnear') {
    return ['near', 'wnear'].includes(symbolA.toLowerCase());
  }

  return symbolA.toLowerCase() === symbolB.toLowerCase();
};

export const WidgetDepositModeContent = ({
  onMsg,
  makeTransfer,
  isLoading,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();

  const {
    alchemyApiKey,
    refetchQuoteInterval,
    chainsFilter: customChainsFilter,
    ...config
  } = useConfig();

  const { onChangeAmount, onChangeToken } = useTokenInputPair();
  const {
    status: tokensStatus,
    refetch: refetchTokens,
    isLoading: isLoadingTokens,
    tokens,
  } = useTokens();

  const { tokenModalOpen, updateTokenModalState } = useTokenModal({ onMsg });

  const [transferResult, setTransferResult] = useState<
    TransferResult | undefined
  >();

  useEffect(() => {
    if (isLoadingTokens || tokens.length === 0) {
      return;
    }

    if (config.sendAddress && ctx.sendAddress !== config.sendAddress) {
      fireEvent('addressSet', config.sendAddress);
    }

    if (
      ctx.targetToken &&
      config.defaultTargetToken &&
      config.defaultTargetToken.blockchain === ctx.targetToken.blockchain &&
      compareTokenSymbols(
        config.defaultTargetToken.symbol,
        ctx.targetToken.symbol,
      )
    ) {
      return;
    }

    if (config.defaultTargetToken) {
      const token = tokens.find((tkn) => {
        return (
          compareTokenSymbols(tkn.symbol, config.defaultTargetToken?.symbol) &&
          tkn.blockchain.toLowerCase() ===
            config.defaultTargetToken?.blockchain.toLowerCase()
        );
      });

      fireEvent('tokenSelect', {
        token,
        variant: 'target',
      });
    }
  }, [
    tokens.length,
    isLoadingTokens,
    config.defaultTargetToken,
    config.sendAddress,
    ctx.sendAddress,
    ctx.targetToken,
  ]);

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
      ['makeQuote', { message: undefined, refetchQuoteInterval }],
      ['setBalancesUsingAlchemyExt', { alchemyApiKey }],
    ],
  });

  useEffect(() => {
    if (!ctx.sourceToken && config.defaultSourceToken && tokens.length > 0) {
      fireEvent('tokenSelect', { variant: 'source', token: tokens[0] });
    }
  }, [ctx.walletAddress, tokens.length]);

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

  const isTargetTokenAddressValid =
    ctx.sendAddress &&
    ctx.targetToken?.blockchain &&
    isValidChainAddress(ctx.targetToken?.blockchain, ctx.sendAddress);

  if (
    !!isLoading ||
    isLoadingTokens ||
    // wait for useEffect to set target token
    (!!config.sendAddress && !ctx.sendAddress) ||
    (!!config.defaultTargetToken && !ctx.targetToken)
  ) {
    return <WidgetDepositModeSkeleton />;
  }

  if (!config.sendAddress || !config.defaultTargetToken) {
    return (
      <BlockingError message="Target token & send address must be explicitly set via config for Deposit Mode." />
    );
  }

  if (!isTargetTokenAddressValid) {
    return (
      <BlockingError message="Target token chain doesn't match chain of a given address/account." />
    );
  }

  if (
    config.sendAddress !== ctx.sendAddress ||
    config.defaultTargetToken.blockchain !== ctx.targetToken?.blockchain ||
    !compareTokenSymbols(
      config.defaultTargetToken.symbol,
      ctx.targetToken?.symbol,
    )
  ) {
    return (
      <BlockingError message="Target for Deposit Mode set via config does not match the current context." />
    );
  }

  if (ctx.state === 'transfer_success' && !!transferResult) {
    return (
      <SuccessScreen
        {...transferResult}
        title={t('transfer.success.deposit.title', 'Deposit successful')}
        backButtonLabel={t(
          'transfer.success.deposit.backToDeposit',
          'Back to deposit',
        )}
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
              heading={t('tokenInput.heading.source.deposit', 'Deposit')}
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
              heading={t('tokenInput.heading.source.deposit', 'Deposit')}
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
      return <WidgetDepositModeSkeleton />;
  }
};
