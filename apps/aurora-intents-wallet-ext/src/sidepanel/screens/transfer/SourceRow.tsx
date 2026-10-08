import { useState } from 'react';

import type { Account } from '../../accounts/types';
import { useAccounts } from '../../accounts/useAccounts';
import { sourceKey, useTransferSource } from '../../accounts/useTransferSource';
import type { TransferSource } from '../../accounts/useTransferSource';
import { useNavigation } from '../../navigation';
import { sourceOptions } from './walletOptions';
import { WalletPicker } from './WalletPicker';
import { WalletSelector } from './WalletSelector';

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
  const { source } = useTransferSource();
  const { push } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);

  const options = sourceOptions(account, secondaries);
  const current =
    options.find((option) => option.id === sourceKey(source)) ?? options[0];

  if (!current) {
    return null;
  }

  return (
    <>
      <WalletSelector
        label="From"
        ariaLabel="Send from wallet"
        option={current}
        onClick={() => setIsOpen(true)}
      />

      {isOpen ? (
        <WalletPicker
          title="Send from wallet"
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
