/**
 * A signed empty intent (`"intents": []`) proving control of an intents
 * account. It moves nothing; `intents.near` can simulate it and the 1Click
 * user-auth endpoint exchanges it for a session.
 *
 * The shapes are the `MultiPayload` variants of the standards this package
 * signs, field names as the contract and 1Click expect them (snake_case).
 */
export type OwnershipProof =
  | {
      standard: 'erc191';
      /** The exact string that was signed. */
      payload: string;
      /** `secp256k1:<base58>` — the public key is recovered from it. */
      signature: string;
    }
  | {
      standard: 'raw_ed25519';
      /** The exact string whose UTF-8 bytes were signed. */
      payload: string;
      /** `ed25519:<base58>` */
      public_key: string;
      /** `ed25519:<base58>` */
      signature: string;
    }
  | {
      standard: 'nep413';
      payload: {
        /** The inner intent JSON, signed by the wallet with NEP-413 framing. */
        message: string;
        /** Base64, 32 bytes. */
        nonce: string;
        recipient: string;
      };
      /** `ed25519:<base58>` */
      public_key: string;
      /** `ed25519:<base58>` */
      signature: string;
    };

export type OwnershipStandard = OwnershipProof['standard'];
