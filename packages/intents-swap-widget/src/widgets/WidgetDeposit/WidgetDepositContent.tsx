import { useEffect, useState } from 'react';

import type { CommonWidgetProps, TokenInputType } from '../types';
import { useTokenModal } from '../../hooks/useTokenModal';
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

import { useStoreSideEffects } from '@/machine/effects';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { fireEvent } from '@/machine/events/utils/fireEvent';

import { useTokenInputPair, useTokens } from '@/hooks';
import { useConfig } from '@/config';

import { isDebug, notReachable } from '@/utils';

import type { Token, TransferResult } from '@/types';

type Msg =
  | { type: 'on_select_token'; token: Token; variant: TokenInputType }
  | { type: 'on_change_deposit_type'; isExternal: boolean }
  | { type: 'on_transfer_success' }
  | { type: 'on_tokens_modal_toggled'; isOpen: boolean };

export type Props = CommonWidgetProps<Msg>;

export const WidgetDepositContent = ({
  providers,
  onMsg,
  makeTransfer,
  isLoading,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { isDirectTransfer } = useComputedSnapshot();
  const { chainsFilter, alchemyApiKey, refetchQuoteInterval } = useConfig();

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

  if (!!isLoading || (tokensStatus !== 'error' && !ctx.sourceToken)) {
    return <WidgetDepositSkeleton />;
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
            variant={tokenModalOpen}
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

            <SubmitButton
              providers={providers}
              makeTransfer={makeTransfer}
              label="Deposit now"
              onSuccess={(transfer) => {
                setTransferResult(transfer);
                onMsg?.({ type: 'on_transfer_success' });
              }}
            />
          </div>
        </div>
      );
    }

    case 'pending':
    default:
      return <WidgetDepositSkeleton />;
  }
};
