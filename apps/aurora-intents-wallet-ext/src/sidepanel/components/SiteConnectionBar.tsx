import { useState } from 'react';

import type { WalletAccount } from '../accounts/types';
import type { SiteConnection } from '../home/useSiteConnection';

const SiteIcon = ({ connection }: { connection: SiteConnection }) => {
  const [hasIcon, setHasIcon] = useState(!!connection.favIconUrl);

  return hasIcon ? (
    <img
      src={connection.favIconUrl}
      alt=""
      width={40}
      height={40}
      onError={() => setHasIcon(false)}
      className="block h-[40px] w-[40px] rounded-sw-md bg-sw-gray-800 object-contain p-sw-xs"
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex h-[40px] w-[40px] items-center justify-center rounded-sw-md bg-sw-gray-800 text-sw-label-lg text-sw-gray-100">
      {connection.host.slice(0, 1).toUpperCase()}
    </span>
  );
};

/** "This site is connected with your wallet", pinned under Home. */
export const SiteConnectionBar = ({
  account,
  connection,
}: {
  account: WalletAccount;
  connection: SiteConnection;
}) => (
  <div
    role="status"
    aria-label={`${connection.host} is connected with ${account.name}`}
    className="flex shrink-0 items-center gap-sw-lg border-t border-sw-gray-900 bg-sw-gray-950 px-sw-xl py-sw-lg">
    <span className="relative shrink-0">
      <SiteIcon connection={connection} />
      <span className="absolute -bottom-[2px] -right-[2px] block h-[12px] w-[12px] rounded-full border-2 border-sw-gray-950 bg-sw-status-success" />
    </span>
    <span className="flex min-w-[0px] flex-col gap-sw-xs">
      <span className="truncate text-sw-label-md text-sw-gray-50">
        {connection.host}
      </span>
      <span className="truncate text-sw-label-sm text-sw-gray-300">
        Connected with {account.name}
      </span>
    </span>
  </div>
);
