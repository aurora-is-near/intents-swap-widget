import { type Address, isAddress } from 'viem';

/**
 * The "Send borrowed funds to another wallet" address. EVM addresses only
 * (decided in the plan review): no ENS names, since funds are delivered on
 * Base or Arbitrum and resolving needs a mainnet client. viem's `isAddress`
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
