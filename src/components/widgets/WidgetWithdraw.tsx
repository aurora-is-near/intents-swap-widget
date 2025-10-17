import { useEffect, useState } from 'react';

import {
  SendAddress,
  SubmitButton,
  SuccessScreen,
  SwapQuote,
  TokenInput,
  TokensModal,
} from '@/features';

import { BlockingError, DirectionSwitcher } from '@/components';

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

import { WidgetCard, WidgetHr } from './ui';
import { WidgetSkeleton } from './shared';
import {
  QUOTE_TYPE,
  TOKEN_INPUT,
  TOKEN_MODAL_STATE,
  type TokenInputType,
  type TokenModalState,
} from './constants';

type Msg =
  | { type: 'on_select_token'; token: Token; variant: TokenInputType }
  | { type: 'on_transfer_success' }
  | { type: 'on_tokens_modal_toggled'; isOpen: boolean };

export type WidgetWithdrawProps = QuoteTransferArgs &
  IntentsTransferArgs & {
    onMsg?: (msg: Msg) => void;
  };

const TokenInputHeader = ({ label }: { label: string }) => (
  <header className="gap-sw-lg px-sw-2xl pt-sw-2xl flex flex-col">
    <span className="text-label-m gap-sw-sm flex items-center text-sw-gray-50">
      {label}
    </span>
    <WidgetHr />
  </header>
);

export const WidgetWithdraw = ({
  providers,
  makeTransfer,
  onMsg,
}: WidgetWithdrawProps) => {
  const { ctx } = useUnsafeSnapshot();
  const { isDirectTransfer } = useComputedSnapshot();
  const { walletAddress, chainsFilter } = useConfig();

  const { status: tokensStatus, refetch: refetchTokens } = useTokens();
  const { onChangeAmount, onChangeToken, lastChangedInput } =
    useTokenInputPair();

  const [transferResult, setTransferResult] = useState<
    TransferResult | undefined
  >();

  const [tokenModalOpen, setTokenModalOpen] = useState<TokenModalState>(
    TOKEN_MODAL_STATE.NONE,
  );

  useEffect(() => {
    onMsg?.({
      type: 'on_tokens_modal_toggled',
      isOpen: tokenModalOpen !== TOKEN_MODAL_STATE.NONE,
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
      [
        'setDefaultSelectedTokens',
        { skipIntents: false, target: 'same-asset' },
      ],
      [
        'makeQuote',
        {
          message: undefined,
          type:
            lastChangedInput === TOKEN_INPUT.TARGET
              ? QUOTE_TYPE.EXACT_OUT
              : QUOTE_TYPE.EXACT_IN,
        },
      ],
      ['setBalancesUsingAlchemyExt', { alchemyApiKey: undefined }],
    ],
  });

  if (!ctx.sourceToken) {
    return <WidgetSkeleton.Withdraw />;
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
      if (tokenModalOpen !== TOKEN_MODAL_STATE.NONE) {
        return (
          <TokensModal
            showBalances
            showChainsSelector={tokenModalOpen === TOKEN_MODAL_STATE.TARGET}
            groupTokens={false}
            chainsFilter={
              tokenModalOpen === TOKEN_MODAL_STATE.SOURCE
                ? chainsFilter.source
                : chainsFilter.target
            }
            onMsg={(msg) => {
              switch (msg.type) {
                case 'on_select_token':
                  onChangeToken(tokenModalOpen, msg.token);
                  setTokenModalOpen(TOKEN_MODAL_STATE.NONE);
                  onMsg?.({
                    type: msg.type,
                    token: msg.token,
                    variant: tokenModalOpen,
                  });
                  break;
                case 'on_dismiss_tokens_modal':
                  setTokenModalOpen(TOKEN_MODAL_STATE.NONE);
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
              <WidgetCard>
                <TokenInputHeader label="Withdraw token" />
                <TokenInput.Source
                  isChanging={lastChangedInput === TOKEN_INPUT.SOURCE}
                  onMsg={(msg) => {
                    switch (msg.type) {
                      case 'on_change_amount':
                        onChangeAmount(TOKEN_INPUT.SOURCE, msg.amount);
                        break;
                      case 'on_click_select_token':
                        setTokenModalOpen(TOKEN_MODAL_STATE.SOURCE);
                        break;
                      default:
                        notReachable(msg);
                    }
                  }}
                />
              </WidgetCard>

              <DirectionSwitcher isEnabled={false} />

              <WidgetCard>
                <TokenInputHeader label="Receive token" />
                <TokenInput.Target
                  isChanging={lastChangedInput === TOKEN_INPUT.TARGET}
                  onMsg={(msg) => {
                    switch (msg.type) {
                      case 'on_change_amount':
                        onChangeAmount(TOKEN_INPUT.TARGET, msg.amount);
                        break;
                      case 'on_click_select_token':
                        setTokenModalOpen(TOKEN_MODAL_STATE.TARGET);
                        break;
                      default:
                        notReachable(msg);
                    }
                  }}
                />
              </WidgetCard>
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

            {!isDirectTransfer && <SwapQuote />}

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
      return <WidgetSkeleton.Withdraw />;
  }
};
