'use client';

import { useEffect, useState } from 'react';
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
import { useConfig } from '../../config';
import {
  MakeTransfer,
  MakeTransferArgs,
  MakeTransferResponse,
} from '../../types';
import { WidgetType } from '../../types/widget';
import { WidgetProfileButton } from './WidgetProfileButton';
import { useUnsafeSnapshot } from '../../machine';

export type Props = Omit<
  WidgetSwapProps | WidgetDepositProps | WidgetWithdrawProps,
  'onMsg' | 'makeTransfer'
> & {
  defaultTab?: WidgetTab;
  onMsg?: (msg: Msg, widgetType: WidgetType) => void;
  makeTransfer?: (
    args: MakeTransferArgs,
    widgetType: WidgetType,
  ) => MakeTransferResponse | Promise<MakeTransferResponse>;
};

type Msg = SwapMsg | DepositMsg | WithdrawMsg;

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
    makeTransfer,
    onMsg,
    ...restProps
}: Props) => {
  const [isTabsVisible, setIsTabsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<WidgetTab>(defaultTab);
  const { enableAccountAbstraction, showProfileButton } = useConfig();
  const { ctx } = useUnsafeSnapshot();

  const switchTab = (tab: WidgetTab) => {
    setActiveTab(tab);
  };

  const handleMsg = <T extends Msg>(msg: T, widgetType: WidgetType) => {
    if (msg.type === 'on_tokens_modal_toggled') {
      setIsTabsVisible(!msg.isOpen);
    }

    if (msg.type === 'on_select_token') {
      setIsTabsVisible(true);
    }

    onMsg?.(msg, widgetType);
  };

  useEffect(() => {
    if (!enableAccountAbstraction) {
      setActiveTab('swap');
    }
  }, [enableAccountAbstraction]);

  const showHeader = ctx.state !== 'transfer_success';

  return (
    <>
      {showHeader && (
        <div className="mb-sw-2xl w-full flex items-center">
          {enableAccountAbstraction && isTabsVisible ? (
            <>
              <WidgetTabs activeTab={activeTab} onSelect={switchTab} />
            </>
          ) : (
            <div className="w-full" />
          )}
          {showProfileButton && <WidgetProfileButton />}
        </div>
      )}

      {(() => {
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
  );
};
