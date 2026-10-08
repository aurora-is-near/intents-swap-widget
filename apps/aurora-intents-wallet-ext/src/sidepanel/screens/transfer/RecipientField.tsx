import { useState } from 'react';

import {
  fireEvent,
  Input,
  isValidChainAddress,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import type { Chains, Token } from '@aurora-is-near/intents-swap-widget';
import { cn, isEvmChain } from '@aurora-is-near/intents-swap-widget/utils';

import { Icon } from '../../components/Icon';
import { chainLabel } from './summary';
import type { WalletOption } from './walletOptions';
import { WalletPicker } from './WalletPicker';

type Recipient = WalletOption & { address: string };

type Props = {
  label: string;
  target: Token;
  /** Networks a pasted address is recognised by, for a wrong-network hint. */
  networks: Chains[];
  /** What to do about an address from `network`, e.g. switch the network. */
  wrongNetworkHint: (network: string) => string;
  /** The account's wallets on the target chain, offered as recipients. */
  recipients: Recipient[];
};

/**
 * Where an external transfer goes. The widget machine validates the address
 * for the target chain; this explains the error and spots a pasted address
 * from another network. One of the account's own wallets is a tap away.
 */
export const RecipientField = ({
  label,
  target,
  networks,
  wrongNetworkHint,
  recipients,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const [isPicking, setIsPicking] = useState(false);
  const address = ctx.sendAddress ?? '';

  const message = (() => {
    const code = ctx.error?.code;

    if (code === 'SEND_ADDRESS_IS_NOT_FOUND') {
      return `There's no ${target.chainName} account with this name.`;
    }

    if (!address) {
      return null;
    }

    // Checked here as it's typed, whatever state the machine is in; also
    // rejected by the machine, or by 1Click when the quote is made.
    const isRejected =
      isValidChainAddress(target.blockchain, address) === false ||
      code === 'SEND_ADDRESS_IS_INVALID' ||
      code === 'TOKEN_IS_NOT_SUPPORTED';

    if (!isRejected) {
      return null;
    }

    const other = networks.find(
      (chain) =>
        chain !== target.blockchain && isValidChainAddress(chain, address),
    );

    if (!other) {
      return `This isn't a valid ${target.chainName} address.`;
    }

    // One format covers every EVM chain.
    const kind = isEvmChain(other) ? 'EVM' : chainLabel(other);
    const article = /^[AEIOU]/.test(kind) ? 'an' : 'a';

    return `This is ${article} ${kind} address. ${wrongNetworkHint(chainLabel(other))}`;
  })();

  const selected = recipients.find(
    (recipient) => recipient.address.toLowerCase() === address.toLowerCase(),
  );

  return (
    <div className="flex shrink-0 flex-col gap-sw-md">
      <div className="flex items-center justify-between px-sw-xs">
        <label
          htmlFor="recipient"
          className="text-sw-label-sm text-sw-gray-200">
          {label}
        </label>
        {recipients.length > 0 ? (
          <button
            type="button"
            onClick={() => setIsPicking(true)}
            className="flex items-center gap-sw-xs text-sw-label-sm text-sw-accent-300 hover:text-sw-accent-200">
            My wallets
            <Icon name="chevronDown" size={14} />
          </button>
        ) : null}
      </div>
      <Input
        // Remounted when a wallet is picked, so the field shows its address.
        key={selected?.id ?? 'typed'}
        id="recipient"
        fontSize="sm"
        defaultValue={address}
        state={message ? 'error' : 'default'}
        placeholder={`${target.chainName} address`}
        onChange={(event) => fireEvent('addressSet', event.target.value)}
      />
      <p
        className={cn(
          'px-sw-xs text-sw-body-sm',
          message ? 'text-sw-status-error' : 'text-sw-gray-400',
        )}>
        {message ??
          `Make sure the address is on ${target.chainName}. Transfers to the wrong network can’t be reversed.`}
      </p>

      {isPicking ? (
        <WalletPicker
          title="Send to"
          description={`Your wallets on ${target.chainName}.`}
          options={recipients}
          selectedId={selected?.id}
          onSelect={(recipient) => {
            fireEvent('addressSet', recipient.address);
            setIsPicking(false);
          }}
          onClose={() => setIsPicking(false)}
        />
      ) : null}
    </div>
  );
};
