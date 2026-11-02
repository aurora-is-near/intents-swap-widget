import { NearContractError } from '@/near/errors';
import { type NearRpcOptions, viewCall } from '@/near/rpc';
import { getProofSignerId } from '@/ownership/payload';
import { INTENTS_CONTRACT, invalidateSalt } from '@/ownership/salt';
import type {
  OwnershipProof,
  OwnershipRejection,
  OwnershipVerdict,
} from '@/ownership/types';

const IMPLICIT_NEAR_ACCOUNT = /^[0-9a-f]{64}$/;

/**
 * `PUBLIC_KEY_NOT_REGISTERED` is a NEAR-only state (a named account must
 * register its key). For erc191 / raw_ed25519 the signer IS the key, so a
 * contract complaining about a public key means the proof was signed by the
 * wrong key — a rejected signature.
 */
const classify = (
  message: string,
  standard: OwnershipProof['standard'],
): OwnershipRejection => {
  if (standard === 'nep413' && /public.?key/i.test(message)) {
    return 'PUBLIC_KEY_NOT_REGISTERED';
  }

  if (/nonce|salt|deadline|expired/i.test(message)) {
    return 'NONCE_REJECTED';
  }

  return 'SIGNATURE_REJECTED';
};

/**
 * A named NEAR account can only sign for itself on `intents.near` with a key
 * it registered there. Asked up front so the failure is named, instead of
 * surfacing as a generic simulation panic.
 *
 * Returns `undefined` when the contract has no such view — the simulation
 * that follows still decides.
 */
const isNearKeyRegistered = async (
  accountId: string,
  publicKey: string,
  rpc: NearRpcOptions,
): Promise<boolean | undefined> => {
  try {
    return await viewCall<boolean>({
      ...rpc,
      contractId: INTENTS_CONTRACT,
      methodName: 'has_public_key',
      args: { account_id: accountId, public_key: publicKey },
    });
  } catch (error) {
    if (error instanceof NearContractError) {
      return undefined;
    }

    throw error;
  }
};

/**
 * Asks `intents.near` to simulate the proof. Nothing is executed or stored.
 *
 * Resolves `{ ok: false, reason }` when the CONTRACT rejects it; throws when
 * the RPC itself fails, so an outage is never reported as "not verified".
 *
 * Unlike the widget, NEP-413 proofs are simulated too: a named NEAR account
 * needs its key registered with `intents.near` before it can authenticate.
 */
export const verifyOwnership = async (
  proof: OwnershipProof,
  rpc: NearRpcOptions = {},
): Promise<OwnershipVerdict> => {
  if (proof.standard === 'nep413') {
    const accountId = getProofSignerId(proof);

    if (accountId && !IMPLICIT_NEAR_ACCOUNT.test(accountId)) {
      const registered = await isNearKeyRegistered(
        accountId,
        proof.public_key,
        rpc,
      );

      if (registered === false) {
        return { ok: false, reason: 'PUBLIC_KEY_NOT_REGISTERED' };
      }
    }
  }

  try {
    await viewCall<unknown>({
      ...rpc,
      contractId: INTENTS_CONTRACT,
      methodName: 'simulate_intents',
      args: { signed: [proof] },
    });

    return { ok: true };
  } catch (error) {
    if (!(error instanceof NearContractError)) {
      throw error;
    }

    const reason = classify(error.message, proof.standard);

    if (reason === 'NONCE_REJECTED') {
      invalidateSalt();
    }

    return { ok: false, reason, detail: error.message };
  }
};
