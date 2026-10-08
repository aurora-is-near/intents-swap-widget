import { useState } from 'react';

import { Badge, Banner, Button } from '@aurora-is-near/intents-swap-widget';

import type { Account } from '../../accounts/types';
import { useAccounts } from '../../accounts/useAccounts';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { WalletIcon } from '../../components/WalletIcon';
import { useNavigation } from '../../navigation';
import { shortAddress } from '../../utils';
import { FAMILY_NETWORKS } from '../../wallet/families';
import { disconnectWalletConnect } from '../../wallet/walletConnect';

const describe = (account: Account) =>
  account.kind === 'passkey'
    ? 'Passkey'
    : `${account.walletName} · ${FAMILY_NETWORKS[account.family]} · ${shortAddress(account.address)}`;

/** What removing an account loses, in the confirmation step. */
const removalWarning = (account: Account) =>
  account.kind === 'passkey'
    ? `Removing ${account.name} deletes this extension's record of its passkey. Funds stay in the account, but you won't be able to reach them from here until passkey sign-in is available. Withdraw first if you're unsure.`
    : `${account.name} is disconnected from the extension. Its funds stay in the wallet and you can connect it again any time.`;

const AccountRow = ({
  account,
  isActive,
  onSelect,
  onRemove,
}: {
  account: Account;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) => (
  <li className="flex list-none items-center gap-sw-md">
    <button
      type="button"
      onClick={onSelect}
      className="flex min-w-[0px] grow items-center gap-sw-lg rounded-sw-md p-sw-lg text-left hover:bg-sw-gray-900">
      {account.kind === 'passkey' ? (
        <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sw-md bg-sw-accent-500 text-sw-gray-950">
          <Icon name="key" />
        </span>
      ) : (
        <WalletIcon name={account.walletName} icon={account.walletIcon} />
      )}
      <span className="flex min-w-[0px] grow flex-col gap-sw-xs">
        <span className="text-sw-label-md text-sw-gray-50">{account.name}</span>
        <span className="truncate text-sw-label-sm text-sw-gray-300">
          {describe(account)}
        </span>
      </span>
      {isActive && <Badge>Active</Badge>}
    </button>
    <button
      type="button"
      aria-label={`Remove ${account.name}`}
      title="Remove"
      onClick={onRemove}
      className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sw-md text-sw-gray-300 hover:bg-sw-gray-900 hover:text-sw-status-error">
      <Icon name="close" size={18} />
    </button>
  </li>
);

export const SettingsScreen = () => {
  const { accounts, active, setActive, remove } = useAccounts();
  const { back, push, reset } = useNavigation();
  const [removing, setRemoving] = useState<Account | null>(null);

  const confirmRemove = async () => {
    if (!removing) {
      return;
    }

    if (removing.kind === 'wallet' && removing.source === 'walletconnect') {
      // Ends the session on the phone too; removal goes ahead regardless.
      await disconnectWalletConnect().catch(() => undefined);
    }

    await remove(removing.id);
    setRemoving(null);

    if (accounts.length === 1) {
      reset({ name: 'welcome' });
    }
  };

  if (removing) {
    return (
      <Screen
        title={`Remove ${removing.name}?`}
        onBack={() => setRemoving(null)}
        footer={
          <>
            {/* The safe choice is the prominent one. */}
            <Button
              variant="primary"
              size="lg"
              onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button variant="outlined" size="lg" onClick={confirmRemove}>
              Remove account
            </Button>
          </>
        }>
        <Banner
          variant={removing.kind === 'passkey' ? 'error' : 'warn'}
          message={removalWarning(removing)}
          hasBg
          multiline
        />
      </Screen>
    );
  }

  return (
    <Screen title="Settings" onBack={back}>
      <section className="flex flex-col gap-sw-sm">
        <span className="px-sw-xs text-sw-label-sm text-sw-gray-100">
          Accounts — {accounts.length}
        </span>
        <ul className="m-0 flex flex-col p-0">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              isActive={account.id === active?.id}
              onSelect={async () => {
                await setActive(account.id);
                back();
              }}
              onRemove={() => setRemoving(account)}
            />
          ))}
        </ul>
      </section>
      <div className="flex flex-col gap-sw-md">
        <Button
          variant="outlined"
          size="md"
          onClick={() => push({ name: 'createPasskey' })}>
          Create passkey account
        </Button>
        <Button
          variant="outlined"
          size="md"
          onClick={() => push({ name: 'connectWallet' })}>
          Connect a wallet
        </Button>
      </div>
    </Screen>
  );
};
