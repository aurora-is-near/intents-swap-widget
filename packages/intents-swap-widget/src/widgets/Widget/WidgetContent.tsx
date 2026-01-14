'use client';

import { useState } from 'react';
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

type WidgetType = 'swap' | 'deposit' | 'withdraw';

export type Props = Omit<
  WidgetSwapProps | WidgetDepositProps | WidgetWithdrawProps,
  'onMsg'
> & {
  onMsg?: (msg: Msg, widget: WidgetType) => void;
};

type Msg = SwapMsg | DepositMsg | WithdrawMsg;

export const WidgetContent = ({ onMsg, ...restProps }: Props) => {
  const [isTabsVisible, setIsTabsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<WidgetTab>('swap');

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

  return (
    <>
      {isTabsVisible && (
        <WidgetTabs activeTab={activeTab} onSelect={switchTab} />
      )}

      {(() => {
        switch (activeTab) {
          case 'swap': {
            return (
              <WidgetSwapContent
                {...restProps}
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
