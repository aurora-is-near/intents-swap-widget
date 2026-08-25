import { failGuard } from '@/errors';
import type { Providers } from '@/types/providers';
import type {
  DeleteSignatureEnvelope,
  SignatureEnvelope,
  SigningPayload,
  SigningStandard,
} from '@/types/signing';
import {
  fromBase64,
  type Nep413Payload,
  signErc191,
  signNep413,
  signRawEd25519,
  signSep53,
  toBase64,
} from '@/signers/standards';

export type SignPayloadArgs = {
  payload: SigningPayload;
  standard: SigningStandard;
  /** The origin wallet address the execution is bound to. */
  address: string;
  providers: Providers;
  /** Required for `sep53`. Supplied by the Stellar wallet package. */
  decodePublicKey?: () => Uint8Array;
};

const requireProvider = <T>(
  provider: T | null | undefined,
  standard: SigningStandard,
): T => {
  if (!provider) {
    return failGuard(
      'WALLET_NOT_CONNECTED',
      `no provider available to sign a ${standard} payload`,
    );
  }

  return provider;
};

const parseNep413Payload = (payloadJson: string): Nep413Payload => {
  const parsed: unknown = JSON.parse(payloadJson);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('nep413 payload_json is not an object');
  }

  return parsed as Nep413Payload;
};

/**
 * Adapts `execution.details.payload` onto the shared standards layer.
 *
 * Which field to sign differs per standard, and getting it wrong produces a
 * signature the backend rejects with no useful diagnostic:
 *
 * - `erc191` / `sep53` — `payload_json`, verbatim as a string.
 * - `raw_ed25519` — the DECODED bytes of `payload_bytes_base64`.
 * - `nep413` — `payload_json` parsed into `{ message, recipient, nonce }`.
 */
export const signIntentsConnectPayload = async ({
  payload,
  standard,
  address,
  providers,
  decodePublicKey,
}: SignPayloadArgs): Promise<SignatureEnvelope> => {
  switch (standard) {
    case 'erc191':
      return signErc191({
        message: payload.payload_json,
        provider: requireProvider(providers.evm, standard),
        expectedAddress: address,
      });

    case 'raw_ed25519':
      // Deliberately the base64-decoded bytes, not payload_json. The widget's
      // 1Click signer encodes the JSON string instead, which does not
      // byte-match what this API verifies against.
      return signRawEd25519({
        bytes: fromBase64(payload.payload_bytes_base64),
        provider: requireProvider(providers.sol, standard),
        expectedAddress: address,
      });

    case 'nep413':
      return signNep413({
        payload: parseNep413Payload(payload.payload_json),
        getProvider: requireProvider(providers.near, standard),
        expectedAccountId: address,
      });

    case 'sep53':
      if (!decodePublicKey) {
        return failGuard(
          'UNSUPPORTED_SIGNING_STANDARD',
          'sep53 requires a decodePublicKey implementation (supply it from the Stellar wallet package)',
        );
      }

      return signSep53({
        message: payload.payload_json,
        provider: requireProvider(providers.stellar, standard),
        expectedAddress: address,
        decodePublicKey,
      });

    default:
      return failGuard(
        'UNSUPPORTED_SIGNING_STANDARD',
        `signing standard ${String(standard)} is not implemented`,
      );
  }
};

export type SignTextArgs = {
  text: string;
  standard: SigningStandard;
  address: string;
  providers: Providers;
  decodePublicKey?: () => Uint8Array;
};

/**
 * `recipient` for a nep413 DELETE. Mixed into the signed digest server-side,
 * so it must be exactly this value — see the delete-execution guide.
 */
const NEP413_DELETE_RECIPIENT = 'intents.near';

const NEP413_NONCE_BYTES = 32;

const randomNonce = (): Uint8Array => {
  const bytes = new Uint8Array(NEP413_NONCE_BYTES);

  globalThis.crypto.getRandomValues(bytes);

  return bytes;
};

/**
 * Signs a bare ASCII string — used only for `delete_execution:{executionId}`.
 * No JSON, no envelope, no hashing: the wallet applies its own standard framing.
 *
 * `nep413` additionally returns the client-generated `{ recipient, nonce }`
 * envelope — the backend needs both to rebuild the exact bytes the wallet
 * signed, and omitting the block is a 400.
 *
 * `sep53` is refused: the delete endpoint accepts only raw_ed25519, nep413,
 * erc191, tip191 and ton_connect, so a Stellar-signed delete would be signed,
 * submitted, and rejected with a 400 anyway. Failing before the wallet prompt
 * is the honest version of that outcome.
 */
export const signIntentsConnectText = async ({
  text,
  standard,
  address,
  providers,
}: SignTextArgs): Promise<DeleteSignatureEnvelope> => {
  switch (standard) {
    case 'erc191':
      return signErc191({
        message: text,
        provider: requireProvider(providers.evm, standard),
        expectedAddress: address,
      });

    case 'raw_ed25519':
      return signRawEd25519({
        bytes: new TextEncoder().encode(text),
        provider: requireProvider(providers.sol, standard),
        expectedAddress: address,
      });

    case 'nep413': {
      const nonceBytes = randomNonce();

      const envelope = await signNep413({
        payload: {
          message: text,
          recipient: NEP413_DELETE_RECIPIENT,
          nonce: toBase64(nonceBytes),
        },
        getProvider: requireProvider(providers.near, standard),
        expectedAccountId: address,
      });

      return {
        ...envelope,
        nep413: {
          recipient: NEP413_DELETE_RECIPIENT,
          nonce: toBase64(nonceBytes),
        },
      };
    }

    case 'sep53':
      return failGuard(
        'UNSUPPORTED_SIGNING_STANDARD',
        'the delete_execution endpoint does not accept sep53 — a Stellar-origin execution cannot be cancelled client-side and clears on expiry',
      );

    default:
      return failGuard(
        'UNSUPPORTED_SIGNING_STANDARD',
        `cancelling a ${String(standard)} origin execution is not supported yet`,
      );
  }
};
