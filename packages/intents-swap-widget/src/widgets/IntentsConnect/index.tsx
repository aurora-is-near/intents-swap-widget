import { useEffect, useMemo } from 'react';
import { CheckW700 as Check } from '@material-symbols-svg/react-rounded/icons/check';

import { useTokenModal } from '../../hooks/useTokenModal';
import type { CommonWidgetProps, TokenInputType } from '../types';

import { IntentsConnectSkeleton } from './IntentsConnectSkeleton';

import { useConfig } from '@/config';
import { BlockingError, Card, Icon } from '@/components';
import { isDebug, notReachable } from '@/utils';
import { useUnsafeSnapshot } from '@/machine/snap';
import {
  DepositSummary,
  SubmitButton,
  TokenInput,
  TokensModal,
} from '@/features';
import { useTokenInputPair, useTokens } from '@/hooks';
import { useStoreSideEffects } from '@/machine/effects';
import { fireEvent } from '@/machine/events/utils/fireEvent';
import { isValidChainAddress } from '@/utils/checkers/isValidChainAddress';
import type { ChainsFilters, Token } from '@/types';

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

export const IntentsConnect = ({ onMsg, isLoading }: Props) => {
  const { ctx } = useUnsafeSnapshot();

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

  const chainsFilters = useMemo((): ChainsFilters => {
    if (customChainsFilter) {
      return customChainsFilter;
    }

    return {
      source: { intents: 'none', external: 'wallet-supported' },
      target: { intents: 'none', external: 'none' },
    };
  }, [customChainsFilter]);

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
    return <IntentsConnectSkeleton />;
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
            className="w-[450px]"
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
        <Card className="bg-sw-gray-950 rounded-sw-lg max-w-[450px] flex flex-col gap-sw-lg">
          <Card className="py-sw-xl px-sw-2xl flex items-center gap-sw-lg">
            <Icon
              size={36}
              label="Partner Icon"
              icon="https://icons.llama.fi/morpho.png"
            />
            <div className="flex flex-col gap-sw-xxs pt-[2px]">
              <span className="text-sw-label-lg text-sw-gray-50">
                Morpho Protocol
              </span>
              <span className="text-sw-body-sm text-sw-gray-700">
                app.morpho.org
              </span>
            </div>
            <div className="bg-sw-status-success text-sw-status-success-dark text-sw-body-sm flex items-center gap-sw-xs rounded-full px-sw-lg py-sw-md ml-auto">
              <div className="-ml-[2px]">
                <Check size={16} strokeWidth={3} />
              </div>
              Verified
            </div>
          </Card>

          <Card className="py-sw-xl px-sw-2xl flex flex-col gap-sw-lg">
            <span className="text-sw-gray-600 text-sw-label-2sm">INTENT</span>
            <div className="flex flex-row items-center gap-x-sw-sm gap-y-sw-xs flex-wrap">
              <span className="text-sw-body-md text-sw-gray-400">Deposit</span>
              <div className="flex items-center gap-sw-sm rounded-full bg-sw-gray-800 pl-sw-sm pr-sw-lg py-sw-xs">
                <Icon
                  size={18}
                  label="Eth Icon"
                  icon="https://icons.llama.fi/morpho.png"
                />
                <span className="text-sw-label-md text-sw-gray-50">1 ETH</span>
              </div>
              <span className="text-sw-body-md text-sw-gray-400">into</span>
              <div className="flex items-center gap-sw-sm rounded-full bg-sw-gray-800 pl-sw-sm pr-sw-lg py-sw-xs">
                <Icon
                  size={18}
                  label="Eth Icon"
                  icon="https://icons.llama.fi/morpho.png"
                />
                <span className="text-sw-label-md text-sw-gray-50">
                  Morpho Protocol
                </span>
              </div>
              <span className="text-sw-body-md text-sw-gray-400">
                and receive
              </span>
              <div className="flex items-center gap-sw-sm rounded-full bg-sw-gray-800 pl-sw-sm pr-sw-lg py-sw-xs">
                <Icon
                  size={18}
                  label="Eth Icon"
                  icon="https://icons.llama.fi/morpho.png"
                />
                <span className="text-sw-label-md text-sw-gray-50">
                  earnEth
                </span>
              </div>
            </div>
          </Card>

          <TokenInput.Source
            showBalance
            heading=""
            className={
              !ctx.sourceToken || !ctx.sourceTokenAmount
                ? 'ring-glow-sweep'
                : 'ring-glow-sweep ring-glow-paused'
            }
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

          <DepositSummary />

          <SubmitButton
            makeTransfer={() => null}
            label="Confirm in your wallet"
            onSuccess={() => {}}
          />
        </Card>
      );
    }

    case 'pending':
    default:
      return <IntentsConnectSkeleton />;
  }
};
