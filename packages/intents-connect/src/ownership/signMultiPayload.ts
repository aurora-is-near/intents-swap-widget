import { isUserRejection, toError } from '@/errors';
import { OwnershipError } from '@/ownership/errors';
import type { OwnershipProof } from '@/ownership/types';
import { signErc191 } from '@/signers/standards/erc191';
import { signNep413 } from '@/signers/standards/nep413';
import { signRawEd25519 } from '@/signers/standards/rawEd25519';
import type { WalletConnector } from '@/types/wallet';

/** What a wallet signs into an `intents.near` `MultiPayload`. */
export type MultiPayloadInput =
  | { standard: 'erc191' | 'raw_ed25519'; payload: string }
  | {
      standard: 'nep413';
      payload: { message: string; nonce: string; recipient: string };
    };

const requireProvider = <T>(provider: T | null | undefined, family: string) => {
  if (!provider) {
    throw new OwnershipError(
      'WALLET_NOT_CONNECTED',
      `the wallet exposes no ${family} provider`,
    );
  }

  return provider;
};

/**
 * Has the wallet sign `input` and returns the `MultiPayload` `intents.near`
 * verifies — one wallet prompt. Shared by ownership proofs and 1Click-prepared
 * intents.
 *
 * - erc191: the payload string, verbatim (`personal_sign`).
 * - raw_ed25519: the UTF-8 bytes of the payload string.
 * - nep413: the NEP-413 message; the wallet frames and hashes it.
 *
 * Never connects a wallet: one without an address is refused.
 */
export const signMultiPayload = async (
  wallet: Pick<
    WalletConnector,
    'signingStandard' | 'getAddress' | 'getProviders'
  >,
  input: MultiPayloadInput,
): Promise<OwnershipProof> => {
  const address = wallet.getAddress();

  if (!address) {
    throw new OwnershipError(
      'WALLET_NOT_CONNECTED',
      'the wallet has not shared an address',
    );
  }

  if (wallet.signingStandard !== input.standard) {
    throw new OwnershipError(
      'UNSUPPORTED_STANDARD',
      `a ${wallet.signingStandard} wallet cannot sign a ${input.standard} payload`,
    );
  }

  const providers = wallet.getProviders();

  try {
    switch (input.standard) {
      case 'erc191': {
        const envelope = await signErc191({
          message: input.payload,
          provider: requireProvider(providers.evm, 'EVM'),
          expectedAddress: address,
        });

        return {
          standard: 'erc191',
          payload: input.payload,
          signature: envelope.signature,
        };
      }

      case 'raw_ed25519': {
        const envelope = await signRawEd25519({
          bytes: new TextEncoder().encode(input.payload),
          provider: requireProvider(providers.sol, 'Solana'),
          expectedAddress: address,
        });

        return {
          standard: 'raw_ed25519',
          payload: input.payload,
          public_key: envelope.publicKey!,
          signature: envelope.signature,
        };
      }

      case 'nep413': {
        const envelope = await signNep413({
          payload: input.payload,
          getProvider: requireProvider(providers.near, 'NEAR'),
          expectedAccountId: address,
        });

        return {
          standard: 'nep413',
          payload: input.payload,
          public_key: envelope.publicKey!,
          signature: envelope.signature,
        };
      }

      default:
        throw new OwnershipError(
          'UNSUPPORTED_STANDARD',
          `signing is not supported for ${(input as { standard: string }).standard}`,
        );
    }
  } catch (error) {
    if (error instanceof OwnershipError) {
      throw error;
    }

    if (isUserRejection(error)) {
      throw new OwnershipError('USER_REJECTED', 'the signature was declined', {
        cause: error,
      });
    }

    throw new OwnershipError('SIGNING_FAILED', toError(error).message, {
      cause: error,
    });
  }
};
