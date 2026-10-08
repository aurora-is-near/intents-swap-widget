import { useState } from 'react';

import {
  Badge,
  Banner,
  Button,
  Input,
} from '@aurora-is-near/intents-swap-widget';

import type { Account } from '../../accounts/types';
import { useAccounts } from '../../accounts/useAccounts';
import {
  AccountSummary,
  describeAccount,
} from '../../components/AccountSummary';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';
import { disconnectWalletConnect } from '../../wallet/walletConnect';

/** What removing an account loses, in the confirmation step. */
const removalWarning = (account: Account) =>
  account.kind === 'passkey'
    ? `Removing ${account.name} deletes this extension's record of its passkey. Funds stay in the account, but you won't be able to reach them from here until passkey sign-in is available. Withdraw first if you're unsure.`
    : `${account.name} is disconnected from the extension. Its funds stay in the wallet and you can connect it again any time.`;

const AccountRow = ({
  account,
  isActive,
  onSelect,
  onRename,
  onRemove,
}: {
  account: Account;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onRemove: () => void;
}) => (
  <li className="flex list-none items-center gap-sw-md">
    <button
      type="button"
      onClick={onSelect}
      className="flex min-w-[0px] grow items-center gap-sw-lg rounded-sw-md p-sw-lg text-left hover:bg-sw-gray-900">
      <AccountSummary account={account} />
      {isActive && <Badge>Active</Badge>}
    </button>
    <button
      type="button"
      aria-label={`Rename ${account.name}`}
      title="Rename"
      onClick={onRename}
      className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sw-md text-sw-gray-300 hover:bg-sw-gray-900 hover:text-sw-gray-50">
      <Icon name="edit" size={18} />
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
  const { accounts, active, setActive, rename, remove } = useAccounts();
  const { back, push, reset } = useNavigation();
  const [removing, setRemoving] = useState<Account | null>(null);
  const [renaming, setRenaming] = useState<Account | null>(null);
  const [name, setName] = useState('');

  const startRename = (account: Account) => {
    setName(account.name);
    setRenaming(account);
  };

  const saveName = async () => {
    if (renaming && name.trim()) {
      await rename(renaming.id, name.trim());
      setRenaming(null);
    }
  };

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

  if (renaming) {
    return (
      <Screen
        title="Rename account"
        onBack={() => setRenaming(null)}
        footer={
          <>
            <Button
              variant="primary"
              size="lg"
              state={name.trim() ? 'default' : 'disabled'}
              onClick={saveName}>
              Save
            </Button>
            <Button
              variant="outlined"
              size="lg"
              onClick={() => setRenaming(null)}>
              Cancel
            </Button>
          </>
        }>
        <label className="flex flex-col gap-sw-md">
          <span className="text-sw-label-sm text-sw-gray-200">
            Account name
          </span>
          <Input
            defaultValue={renaming.name}
            placeholder="Account name"
            maxLength={32}
            focusOnMount
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <p className="m-0 text-sw-body-sm text-sw-gray-300">
          {describeAccount(renaming)}
        </p>
      </Screen>
    );
  }

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
              onRename={() => startRename(account)}
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
