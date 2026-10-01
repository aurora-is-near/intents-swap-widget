import { useState } from 'react';
import { OpenInNewW700 as OpenInNew } from '@material-symbols-svg/react-rounded/icons/open-in-new';
import { RefreshW700 as Refresh } from '@material-symbols-svg/react-rounded/icons/refresh';

import {
  Banner,
  Button,
  TokensModal,
  useStoreSideEffects,
  useTokenInputPair,
  useTokenModal,
} from '@aurora-is-near/intents-swap-widget';
import {
  IntentsConnectProvider,
  useExecution,
} from '@aurora-is-near/intents-connect/react';

import { api } from '../../../api';
import { ALCHEMY_API_KEY } from '../../../config';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { PageWallets } from '../../../wallet/usePageWallets';
import type { WalletSelection } from '../../../wallet/useWalletSelection';
import { usePolymarketAccount } from '../hooks/usePolymarketAccount';
import { AccountCard } from './AccountCard';
import { DepositForm } from './DepositForm';
import { IntermediaryCard } from './IntermediaryCard';
import { PolymarketScreenSkeleton } from './PolymarketScreenSkeleton';
import { WalletCard } from './WalletCard';

const POLYMARKET_URL = 'https://polymarket.com';

type Props = {
  /** The Polymarket tab whose wallets the panel borrows, if any. */
  tabId: number | undefined;
  wallets: PageWallets;
  selection: WalletSelection;
  onBack: () => void;
};

type ReadyWallets = Extract<PageWallets, { status: 'ready' }>;

const Content = ({
  wallets,
  selection,
}: {
  wallets: ReadyWallets;
  selection: WalletSelection;
}) => {
  const exec = useExecution();
  // Polymarket accounts belong to the EVM wallet the site is signed in with,
  // whichever wallet pays for the deposit.
  const siteWallet = wallets.wallets.find((wallet) => wallet.isSiteWallet);
  const account = usePolymarketAccount(siteWallet?.siteAddress ?? undefined);
  const [isBusy, setIsBusy] = useState(false);
  const { onChangeToken } = useTokenInputPair();
  const { tokenModalOpen, updateTokenModalState } = useTokenModal({});
  const { selected } = selection;

  // Rendered in place of the form, not instead of this component: the runner
  // from `useExecution` must survive picking a token.
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
    <div className="flex flex-col gap-sw-lg">
      <WalletCard selection={selection} isLocked={isBusy} />
      <AccountCard
        account={account}
        canDetect={!!siteWallet?.siteAddress}
        phase={exec.phase}
        isLocked={isBusy}
      />
      {selected && <IntermediaryCard wallet={selected} phase={exec.phase} />}
      <DepositForm
        exec={exec}
        account={account.account}
        isAccountValid={account.isValid}
        wallet={selected}
        onOpenTokens={() => updateTokenModalState('source')}
        onBusyChange={setIsBusy}
      />
    </div>
  );
};

const Ready = ({
  wallets,
  selection,
}: {
  wallets: ReadyWallets;
  selection: WalletSelection;
}) => {
  // Balances, token list and wallet address sync for the widget components.
  useStoreSideEffects({
    listenTo: [
      'syncConfig',
      'updateBalances',
      'checkWalletConnection',
      'setSourceTokenBalance',
      ['setBalancesUsingAlchemyExt', { alchemyApiKey: ALCHEMY_API_KEY }],
    ],
  });

  // The selected wallet signs every execution; a new wallet gets a new runner.
  return (
    <IntentsConnectProvider api={api} wallet={selection.connector}>
      <Content wallets={wallets} selection={selection} />
    </IntentsConnectProvider>
  );
};

const Hint = ({
  message,
  action,
}: {
  message: string;
  action?: { label: string; icon: typeof Refresh; onClick: () => void };
}) => (
  <div className="flex flex-col gap-sw-lg">
    <Banner hasBg multiline variant="info" message={message} />
    {action && (
      <Button
        size="md"
        variant="primary"
        icon={action.icon}
        onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);

export const PolymarketScreen = ({
  tabId,
  wallets,
  selection,
  onBack,
}: Props) => {
  const renderBody = () => {
    if (tabId === undefined) {
      return (
        <Hint
          message="Open Polymarket to deposit — the extension uses the wallets available on that page."
          action={{
            label: 'Open polymarket.com',
            icon: OpenInNew,
            onClick: () => {
              void chrome.tabs.create({ url: POLYMARKET_URL });
            },
          }}
        />
      );
    }

    switch (wallets.status) {
      case 'loading':
        return <PolymarketScreenSkeleton />;
      case 'no-bridge':
        return (
          <Hint
            message="This Polymarket tab was opened before the extension was installed or updated. Reload it to continue."
            action={{
              label: 'Reload Polymarket',
              icon: Refresh,
              onClick: () => {
                void chrome.tabs.reload(tabId);
              },
            }}
          />
        );
      case 'ready':
        return <Ready wallets={wallets} selection={selection} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-sw-lg">
      <ScreenHeader title="Polymarket" onBack={onBack} />
      {renderBody()}
    </div>
  );
};
