import { INTENTS_CONTRACT } from '@/ownership/salt';
import type { OwnershipProof } from '@/ownership/types';

/** How long a proof stays valid. 1Click allows at most 5 minutes of skew. */
export const OWNERSHIP_PROOF_TTL_MS = 5 * 60_000;

export type OwnershipMessage = {
  signerId: string;
  /** One instant, rendered as ISO in the payload and as ns in the nonce. */
  deadline: Date;
  /** Base64 versioned nonce. */
  nonce: string;
};

/**
 * The empty-intent payload signed by `erc191` and `raw_ed25519`. Compact JSON
 * in this key order (the order in the 1Click docs); the string signed is the
 * string submitted, so it is built once and never re-serialised.
 */
export const buildIntentPayload = ({
  signerId,
  deadline,
  nonce,
}: OwnershipMessage): string =>
  JSON.stringify({
    signer_id: signerId,
    verifying_contract: INTENTS_CONTRACT,
    deadline: deadline.toISOString(),
    nonce,
    intents: [],
  });

/**
 * The NEP-413 `message`. The nonce and verifying contract travel in the
 * NEP-413 envelope (`nonce`, `recipient`) rather than in the message.
 */
export const buildNep413Message = ({
  signerId,
  deadline,
}: Pick<OwnershipMessage, 'signerId' | 'deadline'>): string =>
  JSON.stringify({
    deadline: deadline.toISOString(),
    intents: [],
    signer_id: signerId,
  });

const readSignerId = (json: string): string | undefined => {
  try {
    const parsed = JSON.parse(json) as { signer_id?: unknown };

    return typeof parsed.signer_id === 'string' ? parsed.signer_id : undefined;
  } catch {
    return undefined;
  }
};

/** The intents account a proof was signed for. */
export const getProofSignerId = (proof: OwnershipProof): string | undefined =>
  readSignerId(
    proof.standard === 'nep413' ? proof.payload.message : proof.payload,
  );
