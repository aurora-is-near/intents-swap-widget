import { useState } from 'react';

import { Badge, Button } from '@aurora-is-near/intents-swap-widget';

import type { Account } from '../../accounts/types';
import { useAccounts } from '../../accounts/useAccounts';
import {
  AccountSummary,
  describeAccount,
} from '../../components/AccountSummary';
import { ConfirmRemoveView } from '../../components/ConfirmRemoveView';
import { Icon } from '../../components/Icon';
import { WalletIcon } from '../../components/WalletIcon';
import { RenameView } from '../../components/RenameView';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';
import { disconnectWalletConnect } from '../../wallet/walletConnect';

/** What removing an account means, in the confirmation step. */
const removalWarning = (account: Account) =>
  account.kind === 'passkey'
    ? 'This deletes the extension’s record of its passkey. Withdraw first if you’re unsure.'
    : 'It’s disconnected from the extension. Nothing happens to the wallet itself.';

const removalPoints = (account: Account) =>
  account.kind === 'passkey'
    ? [
        {
          kind: 'keep' as const,
          text: 'Funds stay in the account on NEAR Intents',
        },
        {
          kind: 'lose' as const,
          text: 'You can’t reach them from here until passkey sign-in is available',
        },
      ]
    : [
        { kind: 'keep' as const, text: 'Funds stay in the wallet' },
        {
          kind: 'keep' as const,
          text: 'Its account on NEAR Intents stays as it is',
        },
        { kind: 'keep' as const, text: 'You can connect it again any time' },
      ];

/** The account's icon, large, for the removal screen. */
const LargeAccountIcon = ({ account }: { account: Account }) =>
  account.kind === 'passkey' ? (
    <span className="flex h-[64px] w-[64px] items-center justify-center rounded-sw-lg bg-sw-accent-500 text-sw-gray-950">
      <Icon name="key" size={30} />
    </span>
  ) : (
    <WalletIcon
      name={account.walletName}
      icon={account.walletIcon}
      size={64}
      className="rounded-sw-lg"
    />
  );

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
  const { accounts, active, secondaries, setActive, rename, remove } =
    useAccounts();

  const { back, push, reset } = useNavigation();
  const [removing, setRemoving] = useState<Account | null>(null);
  const [renaming, setRenaming] = useState<Account | null>(null);

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
      <RenameView
        title="Rename account"
        label="Account name"
        value={renaming.name}
        description={describeAccount(renaming)}
        onSave={async (name) => {
          await rename(renaming.id, name);
          setRenaming(null);
        }}
        onCancel={() => setRenaming(null)}
      />
    );
  }

  if (removing) {
    return (
      <ConfirmRemoveView
        title="Remove account"
        name={removing.name}
        icon={<LargeAccountIcon account={removing} />}
        variant={removing.kind === 'passkey' ? 'error' : 'warn'}
        warning={removalWarning(removing)}
        points={removalPoints(removing)}
        confirmLabel="Remove account"
        onKeep={() => setRemoving(null)}
        onRemove={confirmRemove}
      />
    );
  }

  return (
    <Screen
      title="Settings"
      onBack={back}
      footer={
        <>
          <Button
            variant="primary"
            size="lg"
            onClick={() => push({ name: 'createPasskey' })}>
            Create passkey account
          </Button>
          <Button
            variant="outlined"
            size="lg"
            onClick={() => push({ name: 'connectWallet' })}>
            Connect another wallet
          </Button>
        </>
      }>
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
              onRename={() => setRenaming(account)}
              onRemove={() => setRemoving(account)}
            />
          ))}
        </ul>
      </section>

      {active ? (
        <section className="flex flex-col gap-sw-sm">
          <span className="px-sw-xs text-sw-label-sm text-sw-gray-100">
            {active.name}
          </span>
          <button
            type="button"
            onClick={() => push({ name: 'wallets' })}
            className="flex w-full items-center gap-sw-lg rounded-sw-md p-sw-lg text-left hover:bg-sw-gray-900">
            <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sw-md bg-sw-gray-800 text-sw-gray-100">
              <Icon name="browser" size={20} />
            </span>
            <span className="flex min-w-[0px] grow flex-col gap-sw-xs">
              <span className="text-sw-label-md text-sw-gray-50">
                Secondary wallets
              </span>
              <span className="text-sw-label-sm text-sw-gray-300">
                {secondaries.length === 0
                  ? 'Browser wallets to move funds from and to'
                  : `${secondaries.length} connected`}
              </span>
            </span>
            <span className="text-sw-gray-300">
              <Icon name="chevronRight" size={18} />
            </span>
          </button>
        </section>
      ) : null}
    </Screen>
  );
};
