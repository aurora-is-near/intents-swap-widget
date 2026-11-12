import { useState } from 'react';

import { Button, CopyButton, Tag, truncateMiddle } from '../ui';
import { FAMILY_LABEL } from './families';
import type { ActiveWallet } from './useWalletSession';
import { WalletIcon } from './WalletIcon';

/** The wallet the user pays from, and the way to stop using it. */
export const ActiveWalletCard = ({
  wallet,
  onDisconnect,
}: {
  wallet: ActiveWallet;
  onDisconnect: () => Promise<void>;
}) => {
  const [disconnecting, setDisconnecting] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-card bg-surface-raised p-3 shadow-box">
      <WalletIcon name={wallet.name} icon={wallet.icon} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{wallet.name}</span>
          <Tag>{FAMILY_LABEL[wallet.family]}</Tag>
          {wallet.mobile ? <Tag>Phone</Tag> : null}
        </div>
        <div className="flex items-center gap-0.5 text-text-muted">
          <span title={wallet.address}>{truncateMiddle(wallet.address)}</span>
          <CopyButton value={wallet.address} label="wallet address" />
        </div>
      </div>
      <Button
        variant="secondary"
        disabled={disconnecting}
        onClick={() => {
          setDisconnecting(true);
          void onDisconnect().finally(() => setDisconnecting(false));
        }}>
        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
      </Button>
    </div>
  );
};
