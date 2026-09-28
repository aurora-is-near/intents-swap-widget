import { useState } from 'react';
import { OpenInNewW700 as OpenInNew } from '@material-symbols-svg/react-rounded/icons/open-in-new';
import { RefreshW700 as Refresh } from '@material-symbols-svg/react-rounded/icons/refresh';

import {
  Banner,
  Button,
  Skeleton,
  TokensModal,
  useStoreSideEffects,
  useTokenInputPair,
  useTokenModal,
} from '@aurora-is-near/intents-swap-widget';
import { useExecution } from '@aurora-is-near/intents-connect/react';

import { ALCHEMY_API_KEY } from '../../../config';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { PageWallet } from '../../../wallet/usePageWallet';
import { usePolymarketAccount } from '../hooks/usePolymarketAccount';
import { AccountCard } from './AccountCard';
import { DepositForm } from './DepositForm';
import { IntermediaryCard } from './IntermediaryCard';
import { WalletBalances } from './WalletBalances';
import { WalletCard } from './WalletCard';

const POLYMARKET_URL = 'https://polymarket.com';

type Props = {
  /** The Polymarket tab whose wallet the panel borrows, if any. */
  tabId: number | undefined;
  wallet: PageWallet;
  onBack: () => void;
};

const Connected = ({
  wallet,
}: {
  wallet: Extract<PageWallet, { status: 'connected' }>;
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

  const exec = useExecution();
  const account = usePolymarketAccount(wallet.address);
  const [isBusy, setIsBusy] = useState(false);
  const { onChangeToken } = useTokenInputPair();
  const { tokenModalOpen, updateTokenModalState } = useTokenModal({});

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
      <WalletCard info={wallet.info} address={wallet.address} />
      <AccountCard account={account} phase={exec.phase} isLocked={isBusy} />
      <IntermediaryCard phase={exec.phase} />
      <DepositForm
        exec={exec}
        account={account.account}
        isAccountValid={account.isValid}
        onOpenTokens={() => updateTokenModalState('source')}
        onBusyChange={setIsBusy}
      />
      {!isBusy && (
        <WalletBalances onSelect={(token) => onChangeToken('source', token)} />
      )}
    </div>
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

export const PolymarketScreen = ({ tabId, wallet, onBack }: Props) => {
  const renderBody = () => {
    if (tabId === undefined) {
      return (
        <Hint
          message="Open Polymarket and connect your wallet there — the extension uses that wallet to sign."
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

    switch (wallet.status) {
      case 'loading':
        return <Skeleton height={120} />;
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
      case 'no-wallet':
        return (
          <Hint message="Connect MetaMask (or another browser wallet) on Polymarket to continue. Email logins are not supported yet." />
        );
      case 'connected':
        return <Connected wallet={wallet} />;
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
