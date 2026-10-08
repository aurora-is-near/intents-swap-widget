import { useEffect, useState } from 'react';

import { Badge, Banner, Hr } from '@aurora-is-near/intents-swap-widget';

import { useAccounts } from '../../accounts/useAccounts';
import { Icon, Spinner } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { WalletIcon } from '../../components/WalletIcon';
import { useNavigation } from '../../navigation';
import {
  closeConnector,
  CONNECTOR_URL,
  ensureConnectorTab,
} from '../../wallet/connectorWindow';
import { FAMILY_NETWORKS } from '../../wallet/families';
import type { DetectedWallet } from '../../wallet/types';
import { usePageWallets } from '../../wallet/usePageWallets';

type ConnectorTab =
  | { status: 'opening' }
  | { status: 'open'; tabId: number }
  | { status: 'failed'; message: string };

/** Browser wallets only inject into web pages: open the connector page. */
const useConnectorTab = (attempt: number) => {
  const [tab, setTab] = useState<ConnectorTab>({ status: 'opening' });

  useEffect(() => {
    let isCurrent = true;

    setTab({ status: 'opening' });
    ensureConnectorTab().then(
      (tabId) => isCurrent && setTab({ status: 'open', tabId }),
      (error: unknown) =>
        isCurrent &&
        setTab({
          status: 'failed',
          message: error instanceof Error ? error.message : String(error),
        }),
    );

    return () => {
      isCurrent = false;
    };
  }, [attempt]);

  return tab;
};

const WalletRow = ({
  wallet,
  isLastUsed,
  onClick,
}: {
  wallet: DetectedWallet;
  isLastUsed: boolean;
  onClick: () => void;
}) => (
  <li className="list-none">
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-sw-lg rounded-sw-md p-sw-lg text-left text-sw-gray-50 hover:bg-sw-gray-900">
      <WalletIcon name={wallet.info.name} icon={wallet.info.icon} />
      <span className="flex grow flex-col gap-sw-xs">
        <span className="text-sw-label-md text-sw-gray-50">
          {wallet.info.name}
        </span>
        <span className="text-sw-label-sm text-sw-gray-300">
          {FAMILY_NETWORKS[wallet.family]}
        </span>
      </span>
      {isLastUsed ? (
        <Badge>Last used</Badge>
      ) : (
        <span className="text-sw-gray-300">
          <Icon name="chevronRight" size={18} />
        </span>
      )}
    </button>
  </li>
);

const WalletList = ({ tabId }: { tabId: number }) => {
  const { accounts } = useAccounts();
  const { push } = useNavigation();
  const detected = usePageWallets(tabId);

  if (detected.status === 'loading') {
    return (
      <div className="flex justify-center py-sw-3xl">
        <Spinner size={24} />
      </div>
    );
  }

  if (detected.status === 'no-bridge') {
    return (
      <Banner
        variant="error"
        message="The wallet window stopped responding. Rescan to open it again."
        hasBg
        multiline
      />
    );
  }

  const lastUsed = accounts
    .flatMap((account) => (account.kind === 'wallet' ? [account] : []))
    .sort((a, b) => b.createdAt - a.createdAt)[0]?.walletId;

  return (
    <div className="flex flex-col gap-sw-sm">
      <span className="px-sw-xs text-sw-label-sm text-sw-gray-100">
        Detected in this browser — {detected.wallets.length}
      </span>
      {detected.wallets.length > 0 ? (
        <ul className="m-0 flex flex-col p-0">
          {detected.wallets.map((wallet) => (
            <WalletRow
              key={wallet.id}
              wallet={wallet}
              isLastUsed={wallet.id === lastUsed}
              onClick={() => push({ name: 'connectBrowserWallet', wallet })}
            />
          ))}
        </ul>
      ) : (
        <p className="m-0 px-sw-xs py-sw-lg text-sw-body-md text-sw-gray-300">
          No wallets found yet.
        </p>
      )}
    </div>
  );
};

export const BrowserWalletsScreen = () => {
  const { back } = useNavigation();
  const [attempt, setAttempt] = useState(0);
  const tab = useConnectorTab(attempt);

  const leave = () => {
    // Opened for this list only; connecting reopens it when needed.
    void closeConnector();
    back();
  };

  return (
    <Screen title="Browser wallet" onBack={leave}>
      <div className="flex flex-col gap-sw-sm">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="flex items-center gap-sw-xs text-sw-label-sm text-sw-gray-300 hover:text-sw-gray-50">
            <Icon name="refresh" size={13} />
            Rescan
          </button>
        </div>
        {tab.status === 'opening' && (
          <div className="flex flex-col items-center gap-sw-lg py-sw-3xl text-center">
            <Spinner size={24} />
            <p className="m-0 text-sw-body-sm text-sw-gray-300">
              Opening the wallet window…
            </p>
          </div>
        )}
        {tab.status === 'failed' && (
          <Banner
            variant="error"
            message={`${tab.message}. Wallets are connected through ${CONNECTOR_URL}, which must be reachable.`}
            hasBg
            multiline
          />
        )}
        {/* Keyed so Rescan restarts detection. */}
        {tab.status === 'open' && (
          <WalletList key={attempt} tabId={tab.tabId} />
        )}
      </div>
      <Hr />
      <div className="flex flex-col gap-sw-md px-sw-xs">
        <span className="text-sw-label-md text-sw-gray-50">
          Don’t see your wallet?
        </span>
        <p className="m-0 text-sw-body-sm text-sw-gray-300">
          Make sure the extension is installed and unlocked, then rescan. Any
          wallet that supports EIP-6963, the Solana Wallet Standard or NEAR
          Connect shows up here.
        </p>
      </div>
    </Screen>
  );
};
