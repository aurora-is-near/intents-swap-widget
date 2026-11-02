import type { NearRpcOptions } from '@/near/rpc';
import { signOwnershipProof } from '@/ownership/sign';
import type { OwnershipProof, OwnershipVerdict } from '@/ownership/types';
import { verifyOwnership } from '@/ownership/verify';
import type { VerificationStore } from '@/verification/store';
import type { WalletConnector } from '@/types/wallet';

export type VerifyWalletResult = {
  verdict: OwnershipVerdict;
  /**
   * The signed proof. Valid for 5 minutes — pass it to
   * `session.authorize(wallet, { proof })` to authorize without a second
   * prompt.
   */
  proof: OwnershipProof;
};

/**
 * Checks the wallet can sign for its intents account: signs an ownership
 * proof (one wallet prompt) and has `intents.near` simulate it. A pass is
 * recorded in `store`.
 *
 * `rpcUrls` should be `proofRpcUrls(intentsApi)`.
 */
export const verifyWallet = async (
  wallet: Pick<
    WalletConnector,
    'signingStandard' | 'getAddress' | 'getProviders'
  >,
  {
    store,
    now,
    ...rpc
  }: NearRpcOptions & { store?: VerificationStore; now?: () => number },
): Promise<VerifyWalletResult> => {
  const proof = await signOwnershipProof(wallet, { ...rpc, now });
  const verdict = await verifyOwnership(proof, rpc);

  if (verdict.ok) {
    await store?.markVerified(proof);
  }

  return { verdict, proof };
};
