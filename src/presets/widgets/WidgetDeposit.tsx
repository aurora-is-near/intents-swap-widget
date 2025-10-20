import { useEffect, useState } from 'react';

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

import { useStoreSideEffects } from '@/machine/effects';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine/events/utils/fireEvent';

import { useTokenInputPair, useTokens } from '@/hooks';
import { useConfig } from '@/config';

import { isDebug, notReachable } from '@/utils';

import type {
  IntentsTransferArgs,
  QuoteTransferArgs,
  Token,
  TransferResult,
} from '@/types';

import { WidgetSkeleton } from './WidgetSkeleton';
import type { TokenInputType } from './types';
import { useTokenModal } from '../../hooks/useTokenModal';

type Msg =
  | { type: 'on_select_token'; token: Token; variant: TokenInputType }
  | { type: 'on_change_deposit_type'; isExternal: boolean }
  | { type: 'on_transfer_success' }
  | { type: 'on_tokens_modal_toggled'; isOpen: boolean };

export type WidgetDepositProps = QuoteTransferArgs &
  IntentsTransferArgs & {
    onMsg?: (msg: Msg) => void;
  };

export const WidgetDeposit = ({
  providers,
  onMsg,
  makeTransfer,
}: WidgetDepositProps) => {
  const { ctx } = useUnsafeSnapshot();
  const { isDirectTransfer } = useComputedSnapshot();
  const { chainsFilter, walletAddress } = useConfig();
  const { onChangeAmount, onChangeToken } = useTokenInputPair();
  const { status: tokensStatus, refetch: refetchTokens } = useTokens();
  const { tokenModalOpen, updateTokenModalState } = useTokenModal({ onMsg });

  const [transferResult, setTransferResult] = useState<
    TransferResult | undefined
  >();

  useEffect(() => {
    fireEvent('reset', null);

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
      ['makeQuote', { message: undefined }],
      ['setBalancesUsingAlchemyExt', { alchemyApiKey: undefined }],
    ],
  });

  useEffect(() => {
    onMsg?.({
      type: 'on_change_deposit_type',
      isExternal: ctx.isDepositFromExternalWallet,
    });
  }, [ctx.isDepositFromExternalWallet]);

  if (!ctx.sourceToken) {
    return <WidgetSkeleton.Deposit />;
  }

  if (ctx.state === 'transfer_success' && !!transferResult) {
    return (
      <SuccessScreen
        {...transferResult}
        message={[
          'Your deposit has been successfully completed,',
          'and the funds are now available in your account.',
        ]}
        onMsg={(msg) => {
          switch (msg.type) {
            case 'on_dismiss_success':
              setTransferResult(undefined);
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
            groupTokens={tokenModalOpen === 'source'}
            chainsFilter={
              tokenModalOpen === 'source'
                ? chainsFilter.source
                : chainsFilter.target
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
          <div className="gap-sw-lg relative flex flex-col">
            <TokenInput.Source
              showBalance={!ctx.isDepositFromExternalWallet}
              onMsg={(msg) => {
                switch (msg.type) {
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

            <DepositMethodSwitcher className="mt-sw-md">
              {({ isExternal }) =>
                isExternal ? (
                  <div className="gap-sw-2xl pb-sw-2xl flex flex-col">
                    <ExternalDeposit
                      onMsg={(msg) => {
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
                      }}
                    />
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

            {!isDirectTransfer && <SwapQuote className="mt-sw-md" />}

            {walletAddress ? (
              <SubmitButton
                providers={providers}
                makeTransfer={makeTransfer}
                onMsg={(msg) => {
                  switch (msg.type) {
                    case 'on_successful_transfer':
                      setTransferResult(msg.transfer);
                      onMsg?.({ type: 'on_transfer_success' });
                      break;
                    default:
                      notReachable(msg.type);
                  }
                }}
              />
            ) : (
              <SubmitButton.Error />
            )}
          </div>
        </div>
      );
    }

    case 'pending':
    default:
      return <WidgetSkeleton.Deposit />;
  }
};
