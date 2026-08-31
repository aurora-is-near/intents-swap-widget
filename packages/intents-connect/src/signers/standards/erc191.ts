import type { EvmProvider } from '@/types/providers';
import type { SignatureEnvelope } from '@/types/signing';
import {
  fromHex,
  normaliseRecoveryByte,
  secp256k1Signature,
} from '@/signers/standards/encoding';

export type Erc191SignArgs = {
  /** Signed verbatim. Never parse-then-stringify — that changes the hash. */
  message: string;
  provider: EvmProvider;
  /** The address the execution is bound to. */
  expectedAddress: string;
};

/**
 * EIP-191 `personal_sign`. The wallet applies the
 * `"\x19Ethereum Signed Message:\n" + len` prefix and keccak256 internally, so
 * the message is passed through untouched and never pre-hashed.
 *
 * No `publicKey` is returned: the backend recovers the signer with `ecrecover`,
 * and sending one is rejected.
 */
export const signErc191 = async ({
  message,
  provider,
  expectedAddress,
}: Erc191SignArgs): Promise<SignatureEnvelope> => {
  const resolved = typeof provider === 'function' ? await provider() : provider;

  const accounts = await resolved.request({ method: 'eth_requestAccounts' });

  if (!Array.isArray(accounts)) {
    throw new Error('EVM provider returned no accounts');
  }

  const signingAccount = accounts.find(
    (account): account is string =>
      typeof account === 'string' &&
      account.toLowerCase() === expectedAddress.toLowerCase(),
  );

  if (!signingAccount) {
    throw new Error('Connected EVM account does not match the execution');
  }

  const signature = await resolved.request({
    method: 'personal_sign',
    // Argument order is [message, address].
    params: [message, signingAccount],
  });

  if (typeof signature !== 'string') {
    throw new Error('EVM provider returned no signature');
  }

  return {
    signature: secp256k1Signature(normaliseRecoveryByte(fromHex(signature))),
  };
};
