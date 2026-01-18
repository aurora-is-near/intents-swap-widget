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
import { MakeTransferArgs } from '../../types';
import { WidgetType } from '../../types/widget';
import { WidgetProfileButton } from './WidgetProfileButton';

export type Props = Omit<
  WidgetSwapProps | WidgetDepositProps | WidgetWithdrawProps,
  'onMsg' | 'makeTransfer'
> & {
  onMsg?: (msg: Msg, widgetType: WidgetType) => void;
  makeTransfer?: (args: MakeTransferArgs, widgetType: WidgetType) => void;
};

type Msg = SwapMsg | DepositMsg | WithdrawMsg;

export const WidgetContent = ({ onMsg, makeTransfer, ...restProps }: Props) => {
  const [isTabsVisible, setIsTabsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<WidgetTab>('swap');
  const { enableAccountAbstraction } = useConfig();

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

  return (
    <>
      {enableAccountAbstraction && (
        <div className="mb-sw-2xl w-full flex items-center">
          {isTabsVisible && (
            <WidgetTabs activeTab={activeTab} onSelect={switchTab} />
          )}
          <WidgetProfileButton />
        </div>
      )}

      {(() => {
        switch (activeTab) {
          case 'swap': {
            return (
              <WidgetSwapContent
                {...restProps}
                makeTransfer={(args) => makeTransfer?.(args, 'swap')}
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
                makeTransfer={(args) => makeTransfer?.(args, 'deposit')}
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
                makeTransfer={(args) => makeTransfer?.(args, 'withdraw')}
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
