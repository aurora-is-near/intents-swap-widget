'use client';

import { useCallback, useEffect, useState } from 'react';

import { CloseButton } from '../../components/CloseButton';
import { WidgetTab, WidgetTabs } from '../../components/WidgetTabs';
import {
  Msg as SwapMsg,
  WidgetSwapContent,
  Props as WidgetSwapProps,
} from '../WidgetSwap/WidgetSwapContent';
import {
  Msg as DepositMsg,
  WidgetDepositContent,
  Props as WidgetDepositProps,
} from '../WidgetDeposit/WidgetDepositContent';
import {
  WidgetWithdrawContent,
  Props as WidgetWithdrawProps,
  Msg as WithdrawMsg,
} from '../WidgetWithdraw/WidgetWithdrawContent';
import {
  Msg as DepositModeMsg,
  WidgetDepositModeContent,
  Props as WidgetDepositModeProps,
} from '../WidgetDepositMode/WidgetDepositModeContent';
import { useConfig } from '../../config';
import {
  FakeTransaction,
  MakeTransfer,
  MakeTransferArgs,
  Transaction,
  TransferResult,
} from '../../types';
import { WidgetType } from '../../types/widget';
import { WidgetProfileButton } from './WidgetProfileButton';
import { WidgetHistoryButton } from './WidgetHistoryButton';
import { TransactionHistory } from '../../features/TransactionHistory';
import { BalancesUpdateProvider } from '../../context/BalancesUpdateContext';
import { useUnsafeSnapshot } from '../../machine';
import { cn } from '../../utils/cn';

export type Props = Omit<
  | WidgetSwapProps
  | WidgetDepositProps
  | WidgetWithdrawProps
  | WidgetDepositModeProps,
  'onMsg' | 'makeTransfer'
> & {
  defaultTab?: WidgetTab;
  tabs?: WidgetTab[];
  onMsg?: (msg: Msg, widgetType: WidgetType) => void;
  makeTransfer?: (
    args: MakeTransferArgs,
    widgetType: WidgetType,
  ) => TransferResult | null | Promise<TransferResult | null>;
};

type Msg = SwapMsg | DepositMsg | WithdrawMsg | DepositModeMsg;

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
  defaultTab = 'swap',
  tabs = ['swap', 'deposit', 'withdraw'],
  makeTransfer,
  onMsg,
  ...restProps
}: Props) => {
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [activeTab, setActiveTab] = useState<WidgetTab>(defaultTab);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoricalTransaction, setSelectedHistoricalTransaction] =
    useState<Transaction | FakeTransaction | null>(null);

  const [pendingTransactionsCount, setPendingTransactionsCount] = useState(0);
  const {
    enableAccountAbstraction,
    showProfileButton,
    showTransactionHistory,
    apiKey,
  } = useConfig();

  const { ctx } = useUnsafeSnapshot();

  const switchTab = (tab: WidgetTab) => {
    setActiveTab(tab);
    setShowHistory(false);
  };

  const handleMsg = <T extends Msg>(msg: T, widgetType: WidgetType) => {
    if (msg.type === 'on_tokens_modal_toggled') {
      setIsHeaderHidden(msg.isOpen);
    }

    if (msg.type === 'on_select_token') {
      setIsHeaderHidden(false);
    }

    onMsg?.(msg, widgetType);
  };

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (!enableAccountAbstraction) {
      setActiveTab('swap');
    }
  }, [enableAccountAbstraction]);

  const onPendingTransactionsCountChange = useCallback((count: number) => {
    setPendingTransactionsCount(count);
  }, []);

  const showHeader =
    (!isHeaderHidden || showHistory) && ctx.state !== 'transfer_success';

  return (
    <BalancesUpdateProvider>
      <>
        {showHeader && (
          <div className="mb-sw-xl h-[34px] w-full flex items-center">
            {!!enableAccountAbstraction || tabs.includes('topup') ? (
              <WidgetTabs
                tabs={tabs}
                isEnabled={ctx.quoteStatus !== 'pending'}
                activeTab={showHistory ? null : activeTab}
                onSelect={switchTab}
              />
            ) : (
              <div className="w-full flex items-center">
                {showHistory && (
                  <CloseButton onClick={() => setShowHistory(false)} />
                )}
              </div>
            )}
            {!!showTransactionHistory && !!apiKey && (
              <WidgetHistoryButton
                isActive={showHistory}
                pendingTransactionsCount={pendingTransactionsCount}
                onClick={() => {
                  setIsHeaderHidden(false);
                  setShowHistory((p) => !p);
                  setSelectedHistoricalTransaction(null);
                }}
              />
            )}
            {showProfileButton && <WidgetProfileButton />}
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

        {!showHistory &&
          (() => {
            switch (activeTab) {
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

              case 'deposit': {
                return (
                  <WidgetDepositContent
                    {...restProps}
                    makeTransfer={wrapMakeTransfer(makeTransfer, 'deposit')}
                    onMsg={(msg) => {
                      handleMsg(msg, 'deposit');
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

              case 'withdraw': {
                return (
                  <WidgetWithdrawContent
                    {...restProps}
                    makeTransfer={wrapMakeTransfer(makeTransfer, 'withdraw')}
                    onMsg={(msg) => {
                      handleMsg(msg, 'withdraw');
                    }}
                  />
                );
              }

              default:
                return null;
            }
          })()}
      </>
    </BalancesUpdateProvider>
  );
};
