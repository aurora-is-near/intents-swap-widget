import type { Account, ConnectedWallet } from '../accounts/types';
import { shortAddress } from '../utils';
import { FAMILY_NETWORKS } from '../wallet/families';
import { Icon } from './Icon';
import { WalletIcon } from './WalletIcon';

type WalletLike = Pick<
  ConnectedWallet,
  'name' | 'walletName' | 'walletIcon' | 'family' | 'address'
>;

/** "MetaMask · EVM networks · 0x1234…abcd". */
export const describeWallet = (wallet: WalletLike) =>
  `${wallet.walletName} · ${FAMILY_NETWORKS[wallet.family]} · ${shortAddress(wallet.address)}`;

export const describeAccount = (account: Account) =>
  account.kind === 'passkey' ? 'Passkey' : describeWallet(account);

const Summary = ({
  icon,
  name,
  detail,
}: {
  icon: React.ReactNode;
  name: string;
  detail: string;
}) => (
  <span className="flex min-w-[0px] grow items-center gap-sw-lg">
    {icon}
    <span className="flex min-w-[0px] grow flex-col gap-sw-xs text-left">
      <span className="truncate text-sw-label-md text-sw-gray-50">{name}</span>
      <span className="truncate text-sw-label-sm text-sw-gray-300">
        {detail}
      </span>
    </span>
  </span>
);

/** A wallet's icon, name and details, as listed in Settings and pickers. */
export const WalletSummary = ({ wallet }: { wallet: WalletLike }) => (
  <Summary
    icon={<WalletIcon name={wallet.walletName} icon={wallet.walletIcon} />}
    name={wallet.name}
    detail={describeWallet(wallet)}
  />
);

/** An account's icon, name and wallet details, as listed in Settings. */
export const AccountSummary = ({ account }: { account: Account }) =>
  account.kind === 'passkey' ? (
    <Summary
      icon={
        <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sw-md bg-sw-accent-500 text-sw-gray-950">
          <Icon name="key" />
        </span>
      }
      name={account.name}
      detail="Passkey"
    />
  ) : (
    <WalletSummary wallet={account} />
  );
