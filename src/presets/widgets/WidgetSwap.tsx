import { useEffect, useState } from 'react';

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

import { WidgetSkeleton } from './shared';
import type { TokenInputType, TokenModalState } from './types';

type Msg =
  | { type: 'on_tokens_modal_toggled'; isOpen: boolean }
  | { type: 'on_select_token'; token: Token; variant: TokenInputType }
  | { type: 'on_transfer_success' };

export type WidgetSwapProps = QuoteTransferArgs &
  IntentsTransferArgs & {
    onMsg?: (msg: Msg) => void;
  };

export const WidgetSwap = ({
  providers,
  makeTransfer,
  onMsg,
}: WidgetSwapProps) => {
  const { ctx } = useUnsafeSnapshot();
  const { isDirectTransfer } = useComputedSnapshot();
  const { walletAddress, chainsFilter } = useConfig();

  const { status: tokensStatus, refetch: refetchTokens } = useTokens();
  const { onChangeAmount, onChangeToken, lastChangedInput } =
    useTokenInputPair();

  const [transferResult, setTransferResult] = useState<
    TransferResult | undefined
  >();

  const [tokenModalOpen, setTokenModalOpen] = useState<TokenModalState>('none');

  useEffect(() => {
    onMsg?.({
      type: 'on_tokens_modal_toggled',
      isOpen: tokenModalOpen !== 'none',
    });
  }, [tokenModalOpen]);

  useEffect(() => {
    fireEvent('reset', null);
  }, []);

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
        },
      ],
      ['setBalancesUsingAlchemyExt', { alchemyApiKey: undefined }],
    ],
  });

  if (!ctx.sourceToken) {
    return <WidgetSkeleton.Swap />;
  }

  if (ctx.state === 'transfer_success' && !!transferResult) {
    return (
      <SuccessScreen
        {...transferResult}
        message={[
          'Your swap has been successfully completed,',
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
                  setTokenModalOpen('none');
                  onMsg?.({
                    type: msg.type,
                    token: msg.token,
                    variant: tokenModalOpen,
                  });
                  break;
                case 'on_dismiss_tokens_modal':
                  setTokenModalOpen('none');
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
              <TokenInput.Source
                isChanging={lastChangedInput === 'source'}
                onMsg={(msg) => {
                  switch (msg.type) {
                    case 'on_change_amount':
                      onChangeAmount('source', msg.amount);
                      break;
                    case 'on_click_select_token':
                      setTokenModalOpen('source');
                      break;
                    default:
                      notReachable(msg);
                  }
                }}
              />

              <SwapDirectionSwitcher />

              <TokenInput.Target
                isChanging={lastChangedInput === 'target'}
                onMsg={(msg) => {
                  switch (msg.type) {
                    case 'on_change_amount':
                      onChangeAmount('target', msg.amount);
                      break;
                    case 'on_click_select_token':
                      setTokenModalOpen('target');
                      break;
                    default:
                      notReachable(msg);
                  }
                }}
              />
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
      return <WidgetSkeleton.Swap />;
  }
};
