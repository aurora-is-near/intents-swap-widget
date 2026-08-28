import type { PropsWithChildren } from 'react';

import {
  TokenInput,
  TokensModal,
  useStoreSideEffects,
  useTokenInputPair,
  useTokenModal,
  WidgetContainer,
} from '@aurora-is-near/intents-swap-widget';
import type { WidgetContainerProps } from '@aurora-is-near/intents-swap-widget';

export type WidgetIntentsConnectProps = PropsWithChildren<
  {
    isBusy: boolean;
    alchemyApiKey: string;
  } & Omit<WidgetContainerProps, 'children'>
>;

const WidgetIntentsConnectContent = ({
  isBusy,
  alchemyApiKey,
  children,
}: WidgetIntentsConnectProps) => {
  useStoreSideEffects({
    listenTo: [
      'syncConfig',
      'updateBalances',
      'checkWalletConnection',
      'setSourceTokenBalance',
      ['setBalancesUsingAlchemyExt', { alchemyApiKey }],
    ],
  });

  const { onChangeToken, onChangeAmount } = useTokenInputPair();
  const { tokenModalOpen, updateTokenModalState } = useTokenModal({
    onMsg: () => null,
  });

  if (tokenModalOpen !== 'none') {
    return (
      <TokensModal
        variant="source"
        showBalances
        showChainsSelector
        groupTokens={false}
        chainsFilter={{ intents: 'none', external: 'all' }}
        className="w-full"
        onMsg={(msg) => {
          if (msg.type === 'on_select_token') {
            onChangeToken('source', msg.token);
          }

          updateTokenModalState('none');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col w-full gap-sw-xl">
      <TokenInput.Source
        heading="You send"
        state={isBusy ? 'disabled' : 'default'}
        onMsg={(msg) => {
          if (msg.type === 'on_click_select_token') {
            updateTokenModalState('source');
          }

          if (msg.type === 'on_change_amount') {
            onChangeAmount('source', msg.amount);
          }

          if (msg.type === 'on_select_token') {
            onChangeToken('source', msg.token);
          }
        }}
      />
      {children}
    </div>
  );
};

export const WidgetIntentsConnect = ({
  HeaderComponent,
  FooterComponent,
  isFullPage,
  className,
  children,
  ...contentProps
}: WidgetIntentsConnectProps) => (
  <WidgetContainer
    className={className}
    isFullPage={isFullPage}
    HeaderComponent={HeaderComponent}
    FooterComponent={FooterComponent}>
    <WidgetIntentsConnectContent {...contentProps}>
      {children}
    </WidgetIntentsConnectContent>
  </WidgetContainer>
);
