import { base58, hex } from '@scure/base';

import type { SigningStandard } from '@/types/signing';
import type { WalletConnector } from '@/types/wallet';

/** The wallet families an intents account can be derived for. */
export type IntentsAccountFamily = 'evm' | 'sol' | 'near';

const EVM_ADDRESS = /^0x[0-9a-f]{40}$/i;
// NEAR account ids: 2-64 chars of lowercase alphanumerics separated by single
// `-`, `_` or `.` — implicit (64-hex) and EVM-style (0x…) ids included.
const NEAR_ACCOUNT_ID = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

const decodeSolanaAddress = (address: string): Uint8Array | undefined => {
  try {
    const bytes = base58.decode(address);

    return bytes.length === 32 ? bytes : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The `intents.near` account id a wallet address signs for.
 *
 * - EVM and NEAR: the address, lower-cased.
 * - Solana: the hex of the 32-byte public key the base58 address encodes.
 *
 * Returns `undefined` for an address that does not fit its family, rather than
 * deriving an id nobody can sign for.
 */
export const getIntentsAccountId = ({
  family,
  address,
}: {
  family: IntentsAccountFamily;
  address: string | undefined;
}): string | undefined => {
  if (!address) {
    return undefined;
  }

  switch (family) {
    case 'evm':
      return EVM_ADDRESS.test(address) ? address.toLowerCase() : undefined;

    case 'near': {
      const accountId = address.toLowerCase();

      return accountId.length >= 2 &&
        accountId.length <= 64 &&
        NEAR_ACCOUNT_ID.test(accountId)
        ? accountId
        : undefined;
    }

    case 'sol': {
      const bytes = decodeSolanaAddress(address);

      return bytes ? hex.encode(bytes) : undefined;
    }
    default:
      return undefined;
  }
};

const FAMILY_BY_STANDARD: Partial<
  Record<SigningStandard, IntentsAccountFamily>
> = {
  erc191: 'evm',
  raw_ed25519: 'sol',
  nep413: 'near',
};

/** The account family a signing standard proves ownership for. */
export const getFamilyForStandard = (
  standard: SigningStandard,
): IntentsAccountFamily | undefined => FAMILY_BY_STANDARD[standard];

/**
 * The intents account id of a connected `WalletConnector`, or `undefined` while
 * it is disconnected or signs with a standard this package cannot derive an
 * account for.
 */
export const getWalletIntentsAccountId = (
  wallet:
    | Pick<WalletConnector, 'signingStandard' | 'getAddress'>
    | null
    | undefined,
): string | undefined => {
  if (!wallet) {
    return undefined;
  }

  const family = getFamilyForStandard(wallet.signingStandard);

  return family
    ? getIntentsAccountId({ family, address: wallet.getAddress() })
    : undefined;
};
