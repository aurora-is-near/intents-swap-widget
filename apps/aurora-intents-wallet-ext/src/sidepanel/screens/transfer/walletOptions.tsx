import type { ReactNode } from 'react';

import type { Chains } from '@aurora-is-near/intents-swap-widget';

import type {
  Account,
  ConnectedWallet,
  SecondaryWallet,
} from '../../accounts/types';
import type { TransferSource } from '../../accounts/useTransferSource';
import { sourceKey } from '../../accounts/useTransferSource';
import { describeWallet } from '../../components/AccountSummary';
import { Icon } from '../../components/Icon';
import { WalletIcon } from '../../components/WalletIcon';
import { ownAddress, sameAddress } from './ownAddress';

/** A row in the wallet picker: a spending source or a recipient. */
export type WalletOption = {
  id: string;
  name: string;
  detail: string;
  icon: ReactNode;
};

const AccountTile = () => (
  <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sw-md bg-sw-accent-500 text-sw-gray-950">
    <Icon name="key" />
  </span>
);

const walletIcon = (
  wallet: Pick<ConnectedWallet, 'walletName' | 'walletIcon'>,
) => <WalletIcon name={wallet.walletName} icon={wallet.walletIcon} />;

/** The account's intents balance, its own wallet, and its secondary wallets. */
export const sourceOptions = (
  account: Account,
  secondaries: SecondaryWallet[],
): Array<WalletOption & { source: TransferSource }> => [
  {
    id: sourceKey({ kind: 'account' }),
    source: { kind: 'account' },
    name: account.kind === 'passkey' ? account.name : 'Intents account',
    detail:
      account.kind === 'passkey'
        ? 'Passkey · balance on NEAR Intents'
        : `${account.name} · balance on NEAR Intents`,
    icon: <AccountTile />,
  },
  ...(account.kind === 'wallet'
    ? [
        {
          id: sourceKey({ kind: 'primary' }),
          source: { kind: 'primary' } as const,
          name: account.name,
          detail: describeWallet(account),
          icon: walletIcon(account),
        },
      ]
    : []),
  ...secondaries.map((wallet) => ({
    id: sourceKey({ kind: 'secondary', id: wallet.id }),
    source: { kind: 'secondary', id: wallet.id } as const,
    name: wallet.name,
    detail: describeWallet(wallet),
    icon: walletIcon(wallet),
  })),
];

/** All the account's wallets, own first. */
const allWallets = (
  account: Account,
  secondaries: SecondaryWallet[],
): ConnectedWallet[] => [
  ...(account.kind === 'wallet' ? [account] : []),
  ...secondaries,
];

/**
 * The account's wallets that have an address on `chain`, as recipients —
 * except `exclude` (the wallet the transfer leaves from).
 */
export const recipientOptions = (
  account: Account,
  secondaries: SecondaryWallet[],
  chain: Chains,
  exclude?: string,
): Array<WalletOption & { address: string }> =>
  allWallets(account, secondaries).flatMap((wallet) => {
    const address = ownAddress(wallet, chain);

    if (!address || sameAddress(address, exclude)) {
      return [];
    }

    return [
      {
        id: wallet.id,
        address,
        name: wallet.name,
        detail: describeWallet(wallet),
        icon: walletIcon(wallet),
      },
    ];
  });

/** The name of the account's wallet at `address`, if it is one. */
export const walletNameAt = (
  account: Account,
  secondaries: SecondaryWallet[],
  address: string | undefined,
) =>
  allWallets(account, secondaries).find((wallet) =>
    sameAddress(wallet.address, address),
  )?.name;
