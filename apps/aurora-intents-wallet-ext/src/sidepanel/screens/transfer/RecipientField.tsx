import {
  fireEvent,
  Input,
  isValidChainAddress,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import type { Chains, Token } from '@aurora-is-near/intents-swap-widget';
import { cn, isEvmChain } from '@aurora-is-near/intents-swap-widget/utils';

import type { Account } from '../../accounts/types';
import { ownAddress } from './ownAddress';
import { chainLabel } from './summary';

type Props = {
  label: string;
  account: Account;
  target: Token;
  /** Networks a pasted address is recognised by, for a wrong-network hint. */
  networks: Chains[];
  /** What to do about an address from `network`, e.g. switch the network. */
  wrongNetworkHint: (network: string) => string;
};

/**
 * Where an external transfer goes. The widget machine validates the address
 * for the target chain; this explains the error and spots a pasted address
 * from another network.
 */
export const RecipientField = ({
  label,
  account,
  target,
  networks,
  wrongNetworkHint,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const address = ctx.sendAddress ?? '';
  const own = ownAddress(account, target.blockchain);

  const message = (() => {
    const code = ctx.error?.code;

    if (code === 'SEND_ADDRESS_IS_NOT_FOUND') {
      return `There's no ${target.chainName} account with this name.`;
    }

    // Rejected by the machine, or by 1Click when the quote is made.
    const isRejected =
      code === 'SEND_ADDRESS_IS_INVALID' || code === 'TOKEN_IS_NOT_SUPPORTED';

    if (!isRejected || !address) {
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

  return (
    <div className="flex shrink-0 flex-col gap-sw-md">
      <div className="flex items-center justify-between px-sw-xs">
        <label
          htmlFor="recipient"
          className="text-sw-label-sm text-sw-gray-200">
          {label}
        </label>
        {own && own !== address ? (
          <button
            type="button"
            onClick={() => fireEvent('addressSet', own)}
            className="text-sw-label-sm text-sw-accent-300 hover:text-sw-accent-200">
            Use my wallet
          </button>
        ) : null}
      </div>
      <Input
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
    </div>
  );
};
