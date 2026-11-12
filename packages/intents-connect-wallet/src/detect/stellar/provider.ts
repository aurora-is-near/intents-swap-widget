import { hash, Keypair, Networks } from '@stellar/stellar-sdk';
import type { ModuleInterface } from '@creit.tech/stellar-wallets-kit/types';
import {
  standards,
  type StellarProvider,
} from '@aurora-is-near/intents-connect';

const SEP53_PREFIX = 'Stellar Signed Message:\n';

// No global `Buffer`: the page has none. The SDK's browser bundle carries
// its own, and `hash` takes a string.
const toBytes = (signed: string | Uint8Array): Uint8Array =>
  typeof signed === 'string' ? standards.fromBase64(signed) : signed;

/**
 * Whether `signed` is the SEP-53 signature of `message` by `address`. A
 * wallet that signs another account, or without SEP-53's framing, fails
 * here, before the signature reaches the service: a Stellar execution can't
 * be undone by signing again.
 */
export const isSep53Signature = (
  address: string,
  message: string,
  signed: string | Uint8Array,
): boolean => {
  try {
    const digest = hash(`${SEP53_PREFIX}${message}` as never);

    return Keypair.fromPublicKey(address).verify(
      digest,
      toBytes(signed) as never,
    );
  } catch {
    return false;
  }
};

/**
 * A stellar-wallets-kit module as the `StellarProvider` the SDK signs and
 * transfers with, pinned to the account the user connected.
 */
export const moduleProvider = (
  module: Pick<ModuleInterface, 'signMessage' | 'signTransaction'>,
  address: string,
): StellarProvider => ({
  publicKey: address,
  signMessage: async (message) => {
    // `address` matters: Hana signs with the account it names.
    const { signedMessage, signerAddress } = await module.signMessage(message, {
      address,
      networkPassphrase: Networks.PUBLIC,
    });

    if (!isSep53Signature(address, message, signedMessage)) {
      throw new Error(
        'The wallet signed with another account, or not as SEP-53 requires. Nothing was submitted.',
      );
    }

    return { signedMessage, signerAddress: signerAddress ?? address };
  },
  signTransaction: async (xdr, options) => {
    const { signedTxXdr, signerAddress } = await module.signTransaction(xdr, {
      networkPassphrase: options?.networkPassphrase ?? Networks.PUBLIC,
      address,
    });

    return { signedTxXdr, signerAddress };
  },
});
