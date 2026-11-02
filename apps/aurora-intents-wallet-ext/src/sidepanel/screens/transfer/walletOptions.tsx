import type { ReactNode } from 'react';

import type { Chains } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

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
  /** A tag after the name in the picker, e.g. "Primary". */
  badge?: string;
  /** Short address, shown next to the name in the selector. */
  address?: string;
  /** The icon at `size` px: 40 in lists, smaller in the selector. */
  icon: (size: number) => ReactNode;
};

const accountTile = (size: number) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center bg-sw-accent-500 text-sw-gray-950',
      size < 32 ? 'rounded-sw-sm' : 'rounded-sw-md',
    )}
    style={{ width: size, height: size }}>
    <Icon name="key" size={Math.round(size / 2)} />
  </span>
);

const walletIcon =
  (wallet: Pick<ConnectedWallet, 'walletName' | 'walletIcon'>) =>
  (size: number) => (
    <WalletIcon
      name={wallet.walletName}
      icon={wallet.walletIcon}
      size={size}
      className={size < 32 ? 'rounded-sw-sm text-sw-label-sm' : undefined}
    />
  );

const PRIMARY = 'Primary';

/**
 * The account's wallets to spend from: the primary (its own wallet, or the
 * passkey), whose token list includes the account's intents balance, then
 * its secondary wallets.
 */
export const sourceOptions = (
  account: Account,
  secondaries: SecondaryWallet[],
): Array<WalletOption & { source: TransferSource }> => [
  account.kind === 'wallet'
    ? {
        id: sourceKey({ kind: 'primary' }),
        source: { kind: 'primary' },
        name: account.name,
        detail: describeWallet(account),
        address: account.address,
        badge: PRIMARY,
        icon: walletIcon(account),
      }
    : {
        id: sourceKey({ kind: 'primary' }),
        source: { kind: 'primary' },
        name: account.name,
        detail: 'Passkey · NEAR Intents balance',
        badge: PRIMARY,
        icon: accountTile,
      },
  ...secondaries.map((wallet) => ({
    id: sourceKey({ kind: 'secondary', id: wallet.id }),
    source: { kind: 'secondary', id: wallet.id } as const,
    name: wallet.name,
    detail: describeWallet(wallet),
    address: wallet.address,
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
        badge: wallet.id === account.id ? PRIMARY : undefined,
        icon: walletIcon(wallet),
      },
    ];
  });

/**
 * Where an on-chain token can arrive without typing an address: the
 * account's wallets on `chain`, the spending wallet first.
 */
export const receiveOptions = (
  account: Account,
  secondaries: SecondaryWallet[],
  chain: Chains,
  spending?: string,
) =>
  recipientOptions(account, secondaries, chain).sort(
    (a, b) =>
      Number(sameAddress(b.address, spending)) -
      Number(sameAddress(a.address, spending)),
  );

/** The name of the account's wallet at `address`, if it is one. */
export const walletNameAt = (
  account: Account,
  secondaries: SecondaryWallet[],
  address: string | undefined,
) =>
  allWallets(account, secondaries).find((wallet) =>
    sameAddress(wallet.address, address),
  )?.name;
