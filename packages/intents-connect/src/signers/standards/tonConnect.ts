import type { TonProvider } from '@/types/providers';
import type { SignatureEnvelope } from '@/types/signing';
import {
  assertEd25519SignatureLength,
  ed25519PublicKeyFromBase58,
  ed25519Signature,
  fromBase64,
} from '@/signers/standards/encoding';

export type TonConnectSignArgs = {
  /** Signed as TON Connect sign-data `text`, verbatim. */
  message: string;
  provider: TonProvider;
  /** The address the execution is bound to. */
  expectedAddress: string;
};

/**
 * TON Connect's text sign-data: the wallet signs (ed25519)
 * `sha256(0xffff ‖ "ton-connect/sign-data/" ‖ workchain ‖ address hash ‖
 * domain ‖ timestamp ‖ "txt" ‖ text)`, so the backend needs the address,
 * domain and timestamp the wallet chose to rebuild the digest: they travel
 * as `tonConnect`, with the public key a TON address doesn't carry.
 */
export const signTonConnect = async ({
  message,
  provider,
  expectedAddress,
}: TonConnectSignArgs): Promise<SignatureEnvelope> => {
  if (provider.address && provider.address !== expectedAddress) {
    throw new Error('Connected TON account does not match the execution');
  }

  const { signature, address, domain, timestamp } =
    await provider.signText(message);

  if (!signature) {
    throw new Error('TON wallet returned no signature');
  }

  return {
    signature: ed25519Signature(
      assertEd25519SignatureLength(fromBase64(signature), 'TON Connect'),
    ),
    publicKey: ed25519PublicKeyFromBase58(provider.publicKey),
    tonConnect: { address, domain, timestamp },
  };
};
