export {
  createTimestampedNonceBytes,
  decodeNonce,
  encodeNonce,
  type DecodedNonce,
} from '@/ownership/nonce';
export {
  getCurrentSalt,
  INTENTS_CONTRACT,
  invalidateSalt,
} from '@/ownership/salt';
export {
  buildIntentPayload,
  buildNep413Message,
  getProofSignerId,
  OWNERSHIP_PROOF_TTL_MS,
} from '@/ownership/payload';
export {
  signOwnershipProof,
  type SignOwnershipProofOptions,
} from '@/ownership/sign';
export { verifyOwnership } from '@/ownership/verify';
export { OwnershipError, type OwnershipErrorCode } from '@/ownership/errors';
export type {
  OwnershipProof,
  OwnershipRejection,
  OwnershipStandard,
  OwnershipVerdict,
} from '@/ownership/types';
