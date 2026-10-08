import { useState } from 'react';

import type { Account } from '../../accounts/types';
import { useAccounts } from '../../accounts/useAccounts';
import { sourceKey, useTransferSource } from '../../accounts/useTransferSource';
import type { TransferSource } from '../../accounts/useTransferSource';
import { Icon } from '../../components/Icon';
import { useNavigation } from '../../navigation';
import { shortAddress } from '../../utils';
import { sourceOptions } from './walletOptions';
import { WalletPicker } from './WalletPicker';

type Props = {
  account: Account;
  /** Which screen to come back to after connecting a wallet from here. */
  screen: 'swap' | 'send';
  onChange: (source: TransferSource) => void;
};

/**
 * "From": the account's intents balance, its own wallet or a secondary
 * wallet, with a picker to switch. Above the token input on Swap and Send.
 */
export const SourceRow = ({ account, screen, onChange }: Props) => {
  const { secondaries } = useAccounts();
  const { source, wallet } = useTransferSource();
  const { push } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);

  const options = sourceOptions(account, secondaries);
  const current =
    options.find((option) => option.id === sourceKey(source)) ?? options[0];

  if (!current) {
    return null;
  }

  const address = source.kind === 'account' ? undefined : wallet?.address;

  return (
    <>
      <button
        type="button"
        aria-label="Spend from"
        onClick={() => setIsOpen(true)}
        className="flex shrink-0 items-center gap-sw-md rounded-sw-md bg-sw-gray-900 px-sw-lg py-sw-md text-left hover:bg-sw-gray-800">
        <span className="text-sw-label-sm text-sw-gray-300">From</span>
        <span className="[&>*]:h-[24px] [&>*]:w-[24px] [&>*]:rounded-sw-sm [&_svg]:h-[14px] [&_svg]:w-[14px]">
          {current.icon}
        </span>
        <span className="flex min-w-[0px] grow items-baseline gap-sw-sm">
          <span className="truncate text-sw-label-md text-sw-gray-50">
            {current.name}
          </span>
          {address ? (
            <span className="shrink-0 text-sw-label-sm text-sw-gray-400">
              {shortAddress(address)}
            </span>
          ) : null}
        </span>
        <span className="text-sw-gray-300">
          <Icon name="chevronDown" size={16} />
        </span>
      </button>

      {isOpen ? (
        <WalletPicker
          title="Spend from"
          options={options}
          selectedId={current.id}
          onSelect={(option) => {
            setIsOpen(false);

            if (option.id !== current.id) {
              onChange(option.source);
            }
          }}
          onClose={() => setIsOpen(false)}
          onConnect={() =>
            push({
              name: 'browserWallets',
              role: { kind: 'secondary', returnTo: screen },
            })
          }
        />
      ) : null}
    </>
  );
};
