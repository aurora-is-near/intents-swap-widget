import { useEffect, useState } from 'react';

import {
  SendAddress,
  SubmitButton,
  SuccessScreen,
  SwapQuote,
  TokenInput,
  TokensModal,
} from '@/features';

import { BlockingError, Card, DirectionSwitcher, Hr } from '@/components';

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
import type { TokenInputType } from '../types';
import { useTokenModal } from '../../hooks/useTokenModal';
import { useTypedTranslation } from '../../localisation';
import { WidgetWithdrawSkeleton } from './WidgetWithdrawSkeleton';

type Msg =
  | { type: 'on_select_token'; token: Token; variant: TokenInputType }
  | { type: 'on_transfer_success' }
  | { type: 'on_tokens_modal_toggled'; isOpen: boolean };

export type Props = QuoteTransferArgs &
  IntentsTransferArgs & {
    onMsg?: (msg: Msg) => void;
    isLoading?: boolean;
  };

const TokenInputHeader = ({ label }: { label: string }) => (
  <header className="gap-sw-lg px-sw-2xl pt-sw-2xl flex flex-col">
    <span className="text-label-m gap-sw-sm flex items-center text-sw-gray-50">
      {label}
    </span>
    <Hr />
  </header>
);

export const WidgetWithdrawContent = ({
  providers,
  makeTransfer,
  onMsg,
  isLoading,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { isDirectTransfer } = useComputedSnapshot();
  const { walletAddress, chainsFilter } = useConfig();
  const { t } = useTypedTranslation();
  const { status: tokensStatus, refetch: refetchTokens } = useTokens();
  const { tokenModalOpen, updateTokenModalState } = useTokenModal({ onMsg });
  const { onChangeAmount, onChangeToken, lastChangedInput } =
    useTokenInputPair();

  const [transferResult, setTransferResult] = useState<
    TransferResult | undefined
  >();

  useEffect(() => {
    fireEvent('reset', null);
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
        },
      ],
      ['setBalancesUsingAlchemyExt', { alchemyApiKey: undefined }],
    ],
  });

  if (!!isLoading || !ctx.sourceToken) {
    return <WidgetWithdrawSkeleton />;
  }

  if (ctx.state === 'transfer_success' && !!transferResult) {
    return (
      <SuccessScreen
        {...transferResult}
        message={[
          'Your withdrawal has been successfully completed,',
          'and the funds have been sent to the specified destination.',
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
            variant={tokenModalOpen}
            showChainsSelector={tokenModalOpen === 'target'}
            groupTokens={false}
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
            <div className="gap-sw-lg relative flex flex-col">
              <Card padding="none">
                <TokenInputHeader label="Withdraw token" />
                <TokenInput.Source
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
                <TokenInputHeader label="Receive token" />
                <TokenInput.Target
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

            {!!walletAddress &&
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

            {!isDirectTransfer && <SwapQuote className="mt-sw-md" />}

            {walletAddress ? (
              <SubmitButton
                providers={providers}
                makeTransfer={makeTransfer}
                transferLabel={t(
                  'submit.active.transfer.withdraw',
                  'Swap & withdraw',
                )}
                internalSwapLabel={t(
                  'submit.active.internal.withdraw',
                  'Swap & withdraw',
                )}
                externalSwapLabel={t(
                  'submit.active.external.withdraw',
                  'Swap & withdraw',
                )}
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
      return <WidgetWithdrawSkeleton />;
  }
};
