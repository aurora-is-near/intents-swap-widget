import type { SolanaProvider } from '@/types/providers';
import type { SignatureEnvelope } from '@/types/signing';
import {
  assertEd25519SignatureLength,
  ed25519PublicKeyFromBase58,
  ed25519Signature,
} from '@/signers/standards/encoding';

export type RawEd25519SignArgs = {
  /**
   * The exact bytes the backend hashes.
   *
   * Callers MUST pass decoded bytes, not a UTF-8 encoded string: some wallet
   * versions re-encode strings in a way that does not byte-match what the
   * backend verifies against.
   */
  bytes: Uint8Array;
  provider: SolanaProvider;
  /** Base58 Solana address, which is also the ed25519 public key. */
  expectedAddress: string;
};

/**
 * Raw ed25519 over the payload bytes. No envelope (no SIWS, no
 * `"\x19Solana Signed Message:"`) and no pre-hashing.
 */
export const signRawEd25519 = async ({
  bytes,
  provider,
  expectedAddress,
}: RawEd25519SignArgs): Promise<SignatureEnvelope> => {
  const providerPublicKey = provider.publicKey?.toString();

  if (providerPublicKey && providerPublicKey !== expectedAddress) {
    throw new Error('Connected Solana account does not match the execution');
  }

  const signature = await provider.signMessage(bytes);

  return {
    signature: ed25519Signature(
      assertEd25519SignatureLength(signature, 'Solana'),
    ),
    publicKey: ed25519PublicKeyFromBase58(providerPublicKey ?? expectedAddress),
  };
};
