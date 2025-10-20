import { useState } from 'react';

import { SwapQuote } from '@/features/SwapQuote';
import { TokenInput } from '@/features/TokenInput';
import { TokensModal } from '@/features/TokensModal';
import { SendAddress } from '@/features/SendAddress';
import { SuccessScreen } from '@/features/SuccessScreen';
import { SwapDirectionSwitcher } from '@/features/SwapDirectionSwitcher';
import { SubmitButton } from '@/features/SubmitButton';

import { BlockingError } from '@/components/BlockingError';

import { useTokens } from '@/hooks/useTokens';
import { useTokenInputPair } from '@/hooks/useTokenInputPair';
import type { QuoteTransferArgs } from '@/hooks/useMakeQuoteTransfer';
import type { IntentsTransferArgs } from '@/hooks/useMakeIntentsTransfer';

import { useConfig } from '@/config';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { useStoreSideEffects } from '@/machine/effects';

import { isDebug } from '@/utils/checkers/isDebug';
import { notReachable } from '@/utils/notReachable';

import type { Token } from '@/types/token';
import type { TransferResult } from '@/types/transfer';

import { Wrapper } from './Wrapper';
import { Skeleton } from './Skeleton';

type Msg =
  | { type: 'on_select_token'; token: Token; variant: 'source' | 'target' }
  | { type: 'on_transfer_initialized' }
  | { type: 'on_dismiss_tokens_modal' }
  | { type: 'on_click_select_token' };

export type Props = QuoteTransferArgs &
  IntentsTransferArgs & {
    onMsg: (msg: Msg) => void;
  };

export const WidgetSwap = ({ providers, makeTransfer, onMsg }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { isDirectTransfer } = useComputedSnapshot();
  const { walletAddress, chainsFilter } = useConfig();

  const { onChangeAmount, onChangeToken } = useTokenInputPair();
  const { status: tokensStatus, refetch: refetchTokens } = useTokens();

  const [transferResult, setTransferResult] = useState<
    TransferResult | undefined
  >();

  const [tokenModalOpen, setTokenModalOpen] = useState<
    'source' | 'target' | 'none'
  >('none');

  useStoreSideEffects({
    debug: isDebug(),
    listenTo: [
      'checkWalletConnection',
      'setSourceTokenBalance',
      ['makeQuote', { message: undefined }],
      ['setDefaultSelectedTokens', { skipIntents: false }],
      [
        'setBalancesUsingAlchemyExt',
        { alchemyApiKey: 'DFfe56HsC5zN0p1yox93f' },
      ],
    ],
  });

  // wait for source token to be automatically selected from the list
  if (!ctx.sourceToken) {
    return <Skeleton />;
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
            variant={tokenModalOpen}
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
                  onMsg({
                    type: msg.type,
                    token: msg.token,
                    variant: tokenModalOpen,
                  });
                  break;
                case 'on_dismiss_tokens_modal':
                  setTokenModalOpen('none');
                  onMsg(msg);
                  break;
                default:
                  notReachable(msg);
              }
            }}
          />
        );
      }

      return (
        <Wrapper>
          <div className="gap-sw-lg relative flex flex-col">
            <div className="gap-sw-lg relative flex flex-col">
              <TokenInput.Source
                onMsg={(msg) => {
                  switch (msg.type) {
                    case 'on_change_amount':
                      onChangeAmount('source', msg.amount);
                      break;
                    case 'on_click_select_token':
                      setTokenModalOpen('source');
                      onMsg(msg);
                      break;
                    default:
                      notReachable(msg);
                  }
                }}
              />

              <SwapDirectionSwitcher />

              <TokenInput.Target
                onMsg={(msg) => {
                  switch (msg.type) {
                    case 'on_change_amount':
                      onChangeAmount('target', msg.amount);
                      break;
                    case 'on_click_select_token':
                      setTokenModalOpen('target');
                      onMsg(msg);
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

            {!isDirectTransfer && <SwapQuote />}

            {walletAddress ? (
              <SubmitButton
                providers={providers}
                transferLabel="Swap & send"
                internalSwapLabel="Swap"
                externalSwapLabel="Swap & send"
                makeTransfer={makeTransfer}
                onMsg={(msg) => {
                  switch (msg.type) {
                    case 'on_successful_transfer':
                      setTransferResult(msg.transfer);
                      onMsg({ type: 'on_transfer_initialized' });
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
        </Wrapper>
      );
    }

    case 'pending':
    default:
      return <Skeleton />;
  }
};
