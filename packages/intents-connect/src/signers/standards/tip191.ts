import type { TronProvider } from '@/types/providers';
import type { SignatureEnvelope } from '@/types/signing';
import {
  fromHex,
  normaliseRecoveryByte,
  secp256k1Signature,
} from '@/signers/standards/encoding';

export type Tip191SignArgs = {
  /** Signed verbatim, like erc191: the wallet applies the TRON prefix. */
  message: string;
  provider: TronProvider;
  /** The base58 `T…` address the execution is bound to. */
  expectedAddress: string;
};

/**
 * TIP-191 (`signMessageV2`): secp256k1 over
 * `keccak256("\x19TRON Signed Message:\n" + byteLength + message)`. The wallet
 * applies the prefix and the hash, so the message is passed through untouched.
 *
 * Like erc191, no `publicKey` is sent: the backend recovers the signer.
 */
export const signTip191 = async ({
  message,
  provider,
  expectedAddress,
}: Tip191SignArgs): Promise<SignatureEnvelope> => {
  if (provider.address && provider.address !== expectedAddress) {
    throw new Error('Connected TRON account does not match the execution');
  }

  const signature = await provider.signMessage(message);

  if (typeof signature !== 'string' || !signature) {
    throw new Error('TRON wallet returned no signature');
  }

  return {
    signature: secp256k1Signature(normaliseRecoveryByte(fromHex(signature))),
  };
};
