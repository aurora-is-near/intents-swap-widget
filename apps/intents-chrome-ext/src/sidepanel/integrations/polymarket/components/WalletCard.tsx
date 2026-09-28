import { Card, Icon } from '@aurora-is-near/intents-swap-widget';

import { AddressRow } from '../../../components/AddressRow';
import type { WalletInfo } from '../../../../shared/bridge';

type Props = {
  info: WalletInfo;
  address: string;
};

export const WalletCard = ({ info, address }: Props) => (
  <Card className="flex flex-col gap-sw-lg">
    <div className="flex items-center gap-sw-md">
      <Icon label={info.name} icon={info.icon} size={24} radius={6} />
      <span className="text-sw-label-md text-sw-gray-50">{info.name}</span>
      <span className="ml-auto text-sw-body-sm text-sw-gray-400">
        Connected on Polymarket
      </span>
    </div>
    <AddressRow label="Wallet" address={address} />
  </Card>
);
