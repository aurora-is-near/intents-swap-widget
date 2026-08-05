'use client';

import clsx from 'clsx';
import { BorderBeam } from 'border-beam';
import { Fragment, useCallback, useState } from 'react';

import { cn } from '@/utils/cn';
import { useConfig } from '@/config';
import { MaskPrivacy } from '@/icons';
import { useTypedTranslation } from '@/localisation';
import { CloseButton } from '@/components/CloseButton';
import { fireEvent, useUnsafeSnapshot } from '@/machine';
import { TransactionHistory } from '@/features/TransactionHistory';
import { BalancesUpdateProvider } from '@/context/BalancesUpdateContext';
import type {
  FakeTransaction,
  MakeTransfer,
  MakeTransferArgs,
  Transaction,
  TransferResult,
  WidgetType,
} from '@/types';

import {
  Msg as SwapMsg,
  WidgetSwapContent,
  Props as WidgetSwapProps,
} from '../WidgetSwap/WidgetSwapContent';
import {
  Msg as DepositModeMsg,
  WidgetDepositModeContent,
  Props as WidgetDepositModeProps,
} from '../WidgetDepositMode/WidgetDepositModeContent';

import { SettingsContent } from './SettingsContent';
import { WidgetHistoryButton } from './WidgetHistoryButton';
import { WidgetSettingsButton } from './WidgetSettingsButton';

type Msg = SwapMsg | DepositModeMsg;

export type Props = Omit<
  WidgetSwapProps | WidgetDepositModeProps,
  'onMsg' | 'makeTransfer'
> & {
  defaultMode: 'swap' | 'topup';
  onMsg?: (msg: Msg, widgetType: WidgetType) => void;
  makeTransfer?: (
    args: MakeTransferArgs,
    widgetType: WidgetType,
  ) => TransferResult | null | Promise<TransferResult | null>;
};

const wrapMakeTransfer = (
  makeTransfer: Props['makeTransfer'],
  widgetType: WidgetType,
): MakeTransfer | undefined => {
  // It is important to return undefined if no custom `makeTransfer` function
  // was passed into the widget, as this is how internal hooks such as
  // `useMakeEvmTransfer` know to use their default implementation.
  if (!makeTransfer) {
    return;
  }

  return (args: MakeTransferArgs) => {
    return makeTransfer(args, widgetType);
  };
};

export const WidgetContent = ({
  defaultMode = 'swap',
  makeTransfer,
  onMsg,
  ...restProps
}: Props) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [selectedHistoricalTransaction, setSelectedHistoricalTransaction] =
    useState<Transaction | FakeTransaction | null>(null);

  const [pendingTransactionsCount, setPendingTransactionsCount] = useState(0);
  const {
    apiKey,
    showProfileButton,
    showTransactionHistory,
    confidentialMode: confidentialModeConfig,
  } = useConfig();

  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();

  const handleMsg = <T extends Msg>(msg: T, widgetType: WidgetType) => {
    if (msg.type === 'on_tokens_modal_toggled') {
      setIsHeaderHidden(msg.isOpen);
    }

    if (msg.type === 'on_select_token') {
      setIsHeaderHidden(false);
    }

    if (msg.type === 'on_click_edit_slippage') {
      setShowHistory(false);
      setIsHeaderHidden(false);
      setShowProfile((p) => !p);
    }

    onMsg?.(msg, widgetType);
  };

  const handleConfidentialModeToggle = () => {
    fireEvent(
      'confidentialModeSet',
      ctx.confidentialMode === 'public' ? 'confidential' : 'public',
    );
  };

  const onPendingTransactionsCountChange = useCallback((count: number) => {
    setPendingTransactionsCount(count);
  }, []);

  const showWidget = !showHistory && !showProfile;

  const showHeader =
    (!isHeaderHidden || !showWidget) && ctx.state !== 'transfer_success';

  return (
    <BalancesUpdateProvider>
      <>
        {showHeader && (
          <div className="mb-sw-sm h-[36px] w-full flex items-center">
            <div className="w-full flex items-center">
              {(() => {
                if (!showWidget) {
                  return (
                    <CloseButton
                      onClick={() => {
                        setShowHistory(false);
                        setShowProfile(false);
                      }}
                    />
                  );
                }

                const Wrapper =
                  ctx.confidentialMode === 'confidential'
                    ? BorderBeam
                    : Fragment;

                if (confidentialModeConfig === 'user-choice') {
                  return (
                    <Wrapper>
                      <div
                        onClick={handleConfidentialModeToggle}
                        className={clsx(
                          'flex items-center gap-sw-md bg-sw-gray-900 rounded-full pl-sw-md pr-sw-lg h-sw-4xl border-1 cursor-pointer',
                          {
                            'border-sw-gray-700':
                              ctx.confidentialMode === 'confidential',
                            'border-sw-gray-800':
                              ctx.confidentialMode !== 'confidential',
                          },
                        )}>
                        <MaskPrivacy
                          size={12}
                          className={clsx({
                            'text-sw-gray-50':
                              ctx.confidentialMode === 'confidential',
                            'text-sw-gray-400':
                              ctx.confidentialMode !== 'confidential',
                          })}
                        />
                        <span
                          className={clsx('text-sw-body-md select-none', {
                            'text-sw-gray-50':
                              ctx.confidentialMode === 'confidential',
                            'text-sw-gray-400':
                              ctx.confidentialMode !== 'confidential',
                          })}>
                          {ctx.confidentialMode === 'confidential'
                            ? t(
                                'wallet.confidentialMode.confidentialLabel',
                                'Confidential',
                              )
                            : t(
                                'wallet.confidentialMode.publicLabel',
                                'Not confidential',
                              )}
                        </span>
                      </div>
                    </Wrapper>
                  );
                }

                if (confidentialModeConfig === 'confidential') {
                  return (
                    <BorderBeam>
                      <div className="flex items-center gap-sw-md bg-sw-gray-900 rounded-full pl-sw-md pr-sw-lg h-sw-4xl border-1 border-sw-gray-700">
                        <MaskPrivacy size={12} className="text-sw-gray-50" />
                        <span className="text-sw-label-md text-sw-gray-50 select-none">
                          {t(
                            'wallet.confidentialMode.confidentialLabel',
                            'Confidential',
                          )}
                        </span>
                      </div>
                    </BorderBeam>
                  );
                }

                return null;
              })()}
            </div>
            <div className="flex items-center gap-sw-xs">
              {!!showTransactionHistory && !!apiKey && (
                <WidgetHistoryButton
                  isActive={showHistory}
                  pendingTransactionsCount={pendingTransactionsCount}
                  onClick={() => {
                    setShowProfile(false);
                    setIsHeaderHidden(false);
                    setShowHistory((p) => !p);
                    setSelectedHistoricalTransaction(null);
                  }}
                />
              )}
              {showProfileButton && (
                <WidgetSettingsButton
                  isActive={showProfile}
                  onClick={() => {
                    setShowHistory(false);
                    setIsHeaderHidden(false);
                    setShowProfile((p) => !p);
                  }}
                />
              )}
            </div>
          </div>
        )}

        <div className={cn('w-full', { hidden: !showHistory })}>
          <TransactionHistory
            isVisible={showHistory}
            onPendingTransactionsCountChange={onPendingTransactionsCountChange}
            selectedTransaction={selectedHistoricalTransaction}
            onSelectTransaction={setSelectedHistoricalTransaction}
          />
        </div>

        <div className={cn('w-full', { hidden: !showProfile })}>
          <SettingsContent
            onClose={() => {
              setShowProfile(false);
              setIsHeaderHidden(false);
            }}
          />
        </div>

        {/* Hidden rather than unmounted while History or Profile is open. Both
            widget bodies fire a machine `reset` from a mount effect, so
            unmounting here means closing those views remounts them and wipes the
            selected tokens, amounts and wallet address. */}
        <div className={cn('w-full', { hidden: !showWidget })}>
          {(() => {
            switch (defaultMode) {
              case 'swap': {
                return (
                  <WidgetSwapContent
                    {...restProps}
                    makeTransfer={wrapMakeTransfer(makeTransfer, 'swap')}
                    onMsg={(msg) => {
                      handleMsg(msg, 'swap');
                    }}
                  />
                );
              }

              case 'topup': {
                return (
                  <WidgetDepositModeContent
                    {...restProps}
                    makeTransfer={wrapMakeTransfer(makeTransfer, 'deposit')}
                    onMsg={(msg) => {
                      handleMsg(msg, 'deposit');
                    }}
                  />
                );
              }

              default:
                return null;
            }
          })()}
        </div>
      </>
    </BalancesUpdateProvider>
  );
};
