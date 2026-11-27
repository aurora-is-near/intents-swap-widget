import { isAddress } from 'viem';
import type { Address } from 'viem';

/**
 * The "Send borrowed funds to another wallet" address. EVM addresses only
 * (decided in the plan review): no ENS names, since funds are delivered on
 * the market's EVM chain and resolving needs a mainnet client. viem's `isAddress`
 * is strict, so a mixed-case address must carry a valid checksum.
 */
export type RecipientCheck =
  | { status: 'empty' }
  | { status: 'invalid' }
  | { status: 'valid'; address: Address };

/**
 * `empty` for a blank value (nothing entered yet, not an error), `invalid`
 * for anything that is not an address, else `valid` with the address.
 * Surrounding spaces, as a paste often brings, are ignored.
 */
export const validateRecipient = (value: string): RecipientCheck => {
  const address = value.trim();

  if (address === '') {
    return { status: 'empty' };
  }

  return isAddress(address)
    ? { status: 'valid', address }
    : { status: 'invalid' };
};

/**
 * Where the borrowed funds go:
 * - `required`: the connected wallet is not EVM (`walletFamily` set and not
 *   `evm`), so it can't receive on the market's chain and must name an EVM
 *   recipient. An unknown family (`null`, or not given) is not taken for a
 *   non-EVM one.
 * - `enabled`: the box is ticked, or the recipient is required.
 * - `address`: what the borrow plan sends the funds to (`params.recipient`),
 *   the valid address while `enabled`, else `undefined` (the wallet itself).
 */
export const recipientState = ({
  connected,
  walletFamily,
  ticked,
  value,
}: {
  connected: boolean;
  walletFamily: string | null | undefined;
  ticked: boolean;
  value: string;
}): {
  required: boolean;
  enabled: boolean;
  check: RecipientCheck;
  address: Address | undefined;
} => {
  const required =
    connected &&
    walletFamily !== undefined &&
    walletFamily !== null &&
    walletFamily !== 'evm';

  const enabled = ticked || required;
  const check = validateRecipient(value);

  return {
    required,
    enabled,
    check,
    address: enabled && check.status === 'valid' ? check.address : undefined,
  };
};
