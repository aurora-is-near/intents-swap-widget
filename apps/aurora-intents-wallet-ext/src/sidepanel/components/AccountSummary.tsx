import type { Account } from '../accounts/types';
import { shortAddress } from '../utils';
import { FAMILY_NETWORKS } from '../wallet/families';
import { Icon } from './Icon';
import { WalletIcon } from './WalletIcon';

export const describeAccount = (account: Account) =>
  account.kind === 'passkey'
    ? 'Passkey'
    : `${account.walletName} · ${FAMILY_NETWORKS[account.family]} · ${shortAddress(account.address)}`;

/** An account's icon, name and wallet details, as listed in Settings. */
export const AccountSummary = ({ account }: { account: Account }) => (
  <span className="flex min-w-[0px] grow items-center gap-sw-lg">
    {account.kind === 'passkey' ? (
      <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sw-md bg-sw-accent-500 text-sw-gray-950">
        <Icon name="key" />
      </span>
    ) : (
      <WalletIcon name={account.walletName} icon={account.walletIcon} />
    )}
    <span className="flex min-w-[0px] grow flex-col gap-sw-xs text-left">
      <span className="truncate text-sw-label-md text-sw-gray-50">
        {account.name}
      </span>
      <span className="truncate text-sw-label-sm text-sw-gray-300">
        {describeAccount(account)}
      </span>
    </span>
  </span>
);
