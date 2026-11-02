import { CopyButton } from '@aurora-is-near/intents-swap-widget';

import { shortAddress } from '../utils';

type Props = {
  label: string;
  address: string;
};

export const AddressRow = ({ label, address }: Props) => (
  <div className="flex items-center justify-between gap-sw-md">
    <span className="text-sw-body-md text-sw-gray-400">{label}</span>
    <span className="flex items-center gap-sw-sm text-sw-label-md text-sw-gray-100">
      <span title={address}>{shortAddress(address)}</span>
      <CopyButton value={address} />
    </span>
  </div>
);
