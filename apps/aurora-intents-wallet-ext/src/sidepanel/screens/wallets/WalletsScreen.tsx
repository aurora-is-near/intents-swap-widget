import { useState } from 'react';

import { Badge, Button } from '@aurora-is-near/intents-swap-widget';

import type { Account, SecondaryWallet } from '../../accounts/types';
import { useAccounts } from '../../accounts/useAccounts';
import {
  AccountSummary,
  describeWallet,
  WalletSummary,
} from '../../components/AccountSummary';
import { ConfirmRemoveView } from '../../components/ConfirmRemoveView';
import { Icon } from '../../components/Icon';
import { RenameView } from '../../components/RenameView';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';

const WalletRow = ({
  wallet,
  onRename,
  onRemove,
}: {
  wallet: SecondaryWallet;
  onRename: () => void;
  onRemove: () => void;
}) => (
  <li className="flex list-none items-center gap-sw-md">
    <div className="flex min-w-[0px] grow items-center gap-sw-lg p-sw-lg">
      <WalletSummary wallet={wallet} />
    </div>
    <button
      type="button"
      aria-label={`Rename ${wallet.name}`}
      title="Rename"
      onClick={onRename}
      className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sw-md text-sw-gray-300 hover:bg-sw-gray-900 hover:text-sw-gray-50">
      <Icon name="edit" size={18} />
    </button>
    <button
      type="button"
      aria-label={`Remove ${wallet.name}`}
      title="Remove"
      onClick={onRemove}
      className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sw-md text-sw-gray-300 hover:bg-sw-gray-900 hover:text-sw-status-error">
      <Icon name="close" size={18} />
    </button>
  </li>
);

/** The active account's wallets: its own, and the secondary ones. */
export const WalletsScreen = ({ account }: { account: Account }) => {
  const { secondaries, renameSecondary, removeSecondary } = useAccounts();
  const { back, push } = useNavigation();
  const [renaming, setRenaming] = useState<SecondaryWallet | null>(null);
  const [removing, setRemoving] = useState<SecondaryWallet | null>(null);

  if (renaming) {
    return (
      <RenameView
        title="Rename wallet"
        label="Wallet name"
        value={renaming.name}
        description={describeWallet(renaming)}
        onSave={async (name) => {
          await renameSecondary(renaming.id, name);
          setRenaming(null);
        }}
        onCancel={() => setRenaming(null)}
      />
    );
  }

  if (removing) {
    return (
      <ConfirmRemoveView
        title={`Remove ${removing.name}?`}
        variant="warn"
        warning={`${removing.name} is disconnected from ${account.name}. Its funds stay in the wallet and you can connect it again any time.`}
        confirmLabel="Remove wallet"
        onKeep={() => setRemoving(null)}
        onRemove={async () => {
          await removeSecondary(removing.id);
          setRemoving(null);
        }}
      />
    );
  }

  return (
    <Screen
      title="Wallets"
      onBack={back}
      footer={
        <Button
          variant="primary"
          size="lg"
          onClick={() =>
            push({
              name: 'browserWallets',
              role: { kind: 'secondary', returnTo: 'wallets' },
            })
          }>
          Connect a wallet
        </Button>
      }>
      <section className="flex flex-col gap-sw-sm">
        <span className="px-sw-xs text-sw-label-sm text-sw-gray-100">
          Account
        </span>
        <div className="flex items-center gap-sw-lg rounded-sw-md bg-sw-gray-900 p-sw-lg">
          <AccountSummary account={account} />
          <Badge>Primary</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-sw-sm">
        <span className="px-sw-xs text-sw-label-sm text-sw-gray-100">
          Secondary wallets — {secondaries.length}
        </span>
        {secondaries.length > 0 ? (
          <ul className="m-0 flex flex-col p-0">
            {secondaries.map((wallet) => (
              <WalletRow
                key={wallet.id}
                wallet={wallet}
                onRename={() => setRenaming(wallet)}
                onRemove={() => setRemoving(wallet)}
              />
            ))}
          </ul>
        ) : (
          <p className="m-0 px-sw-xs py-sw-lg text-sw-body-md text-sw-gray-300">
            No secondary wallets yet. Connect a browser wallet to move funds
            from and to it.
          </p>
        )}
      </section>

      <div className="flex items-start gap-sw-md rounded-sw-md bg-sw-gray-900 p-sw-lg">
        <span className="text-sw-gray-300">
          <Icon name="shield" size={18} />
        </span>
        <p className="m-0 text-sw-body-sm text-sw-gray-300">
          Secondary wallets only move funds. They never sign for {account.name}{' '}
          or for apps, and switching accounts keeps each account’s own list.
        </p>
      </div>
    </Screen>
  );
};
