/**
 * Signing standards.
 *
 * Two distinct sets, deliberately:
 *
 * - `SigningStandard` is the WIRE contract — every value the API can put in
 *   `details.signingStandard`. It is pinned against the OpenAPI document by
 *   `api/generated/conformance.ts`, so a new server-side standard becomes a
 *   type error here rather than a runtime surprise.
 * - `SupportedSigningStandard` is the subset this package can actually sign.
 *
 * Keeping them apart makes "the API asked for a standard we do not implement" a
 * typed, reachable branch instead of an unreachable `default` case.
 */
export type SigningStandard =
  | 'erc191' // EVM      secp256k1 — publicKey MUST be omitted (ecrecover)
  | 'tip191' // Tron     secp256k1 — not implemented yet
  | 'raw_ed25519' // Solana   ed25519   — publicKey required; sign payload bytes
  | 'nep413' // NEAR     ed25519   — publicKey required; sign {message,recipient,nonce}
  | 'sep53' // Stellar  ed25519   — publicKey required (StrKey-decoded)
  | 'ton_connect'; // TON      ed25519   — not implemented yet; needs the tonConnect envelope

export type SupportedSigningStandard = Extract<
  SigningStandard,
  'erc191' | 'raw_ed25519' | 'nep413' | 'sep53'
>;

export const SUPPORTED_SIGNING_STANDARDS: readonly SupportedSigningStandard[] =
  ['erc191', 'raw_ed25519', 'nep413', 'sep53'];

/**
 * Standards whose `/submit` body must carry a `publicKey`: ed25519 cannot
 * recover a key from a signature. Includes `ton_connect` even though signing it
 * is unimplemented — the asymmetry is a property of the curve, not of our
 * coverage.
 */
export const ED25519_STANDARDS: readonly SigningStandard[] = [
  'raw_ed25519',
  'nep413',
  'sep53',
  'ton_connect',
];

export const isSupportedSigningStandard = (
  standard: SigningStandard,
): standard is SupportedSigningStandard =>
  (SUPPORTED_SIGNING_STANDARDS as readonly SigningStandard[]).includes(
    standard,
  );

/** `details.payload` as returned by the API. */
export type SigningPayload = {
  standard: SigningStandard;
  /** Sign verbatim for erc191 / sep53. Parse for nep413. */
  payload_json: string;
  /** Base64. Decode to bytes and sign those for raw_ed25519. */
  payload_bytes_base64: string;
};

/**
 * The wallet-chosen envelope a TON signature must be submitted with: the wallet
 * folds these into the signed digest, so the backend needs them to rebuild it.
 */
export type TonConnectEnvelope = {
  domain: string;
  timestamp: number;
  address: string;
};

/**
 * NEP-413 mixes `recipient` and `nonce` into the signed digest, so a DELETE
 * signed with nep413 must repeat them on the wire for the backend to rebuild
 * the exact bytes the wallet signed. Omitting the block is a 400.
 */
export type Nep413Envelope = {
  recipient: string;
  /** Base64-encoded 32 bytes — the same nonce handed to the wallet as raw bytes. */
  nonce: string;
};

/** What `/submit` and `DELETE` accept. */
export type SignatureEnvelope = {
  /** `secp256k1:<bs58>` or `ed25519:<bs58>` */
  signature: string;
  /** ed25519 standards only — omitted for secp256k1. */
  publicKey?: string;
  /** `ton_connect` only. */
  tonConnect?: TonConnectEnvelope;
};

/**
 * The DELETE body only: `/submit` does not accept the nep413 block (the create
 * payload already carries recipient and nonce), while a nep413 DELETE is a 400
 * without it.
 */
export type DeleteSignatureEnvelope = SignatureEnvelope & {
  /** nep413 only — the client-generated envelope. */
  nep413?: Nep413Envelope;
};
