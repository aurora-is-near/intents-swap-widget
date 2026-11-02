import { getFamilyForStandard, getIntentsAccountId } from '@/account';
import { isUserRejection, toError } from '@/errors';
import type { NearRpcOptions } from '@/near/rpc';
import { OwnershipError } from '@/ownership/errors';
import { createTimestampedNonceBytes, encodeNonce } from '@/ownership/nonce';
import {
  buildIntentPayload,
  buildNep413Message,
  OWNERSHIP_PROOF_TTL_MS,
} from '@/ownership/payload';
import { getCurrentSalt, INTENTS_CONTRACT } from '@/ownership/salt';
import type { OwnershipProof } from '@/ownership/types';
import { signErc191 } from '@/signers/standards/erc191';
import { signNep413 } from '@/signers/standards/nep413';
import { signRawEd25519 } from '@/signers/standards/rawEd25519';
import type { WalletConnector } from '@/types/wallet';

export type SignOwnershipProofOptions = NearRpcOptions & {
  /** Clock, for tests. */
  now?: () => number;
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
 * Signs an empty intent proving the wallet controls its intents account.
 *
 * One wallet prompt. The proof moves nothing; pass it to `verifyOwnership`
 * (contract simulation) and/or `IntentsApi.authenticate` (user session) — the
 * same proof works for both within its 5-minute validity.
 *
 * Never connects a wallet: a wallet without an address is refused rather than
 * prompted, because `eth_requestAccounts` would open a connect dialog.
 *
 * `rpcUrls` is used for `intents.near`'s `current_salt`; prefer
 * `proofRpcUrls(intentsApi)`.
 */
export const signOwnershipProof = async (
  wallet: Pick<
    WalletConnector,
    'signingStandard' | 'getAddress' | 'getProviders'
  >,
  options: SignOwnershipProofOptions = {},
): Promise<OwnershipProof> => {
  const { now = Date.now, ...rpc } = options;
  const { signingStandard } = wallet;
  const address = wallet.getAddress();

  if (!address) {
    throw new OwnershipError(
      'WALLET_NOT_CONNECTED',
      'the wallet has not shared an address',
    );
  }

  const family = getFamilyForStandard(signingStandard);

  if (!family) {
    throw new OwnershipError(
      'UNSUPPORTED_STANDARD',
      `ownership proofs are not supported for ${signingStandard}`,
    );
  }

  const signerId = getIntentsAccountId({ family, address });

  if (!signerId) {
    throw new OwnershipError(
      'WALLET_NOT_CONNECTED',
      `${address} is not a valid ${family} address`,
    );
  }

  const salt = await getCurrentSalt({ ...rpc, now });
  const start = new Date(now());
  const deadline = new Date(start.getTime() + OWNERSHIP_PROOF_TTL_MS);
  const nonce = encodeNonce(salt, deadline, createTimestampedNonceBytes(start));
  const providers = wallet.getProviders();

  try {
    switch (signingStandard) {
      case 'erc191': {
        const payload = buildIntentPayload({ signerId, deadline, nonce });
        const envelope = await signErc191({
          message: payload,
          provider: requireProvider(providers.evm, 'EVM'),
          expectedAddress: address,
        });

        return {
          standard: 'erc191',
          payload,
          signature: envelope.signature,
        };
      }

      case 'raw_ed25519': {
        const payload = buildIntentPayload({ signerId, deadline, nonce });
        const envelope = await signRawEd25519({
          bytes: new TextEncoder().encode(payload),
          provider: requireProvider(providers.sol, 'Solana'),
          expectedAddress: address,
        });

        return {
          standard: 'raw_ed25519',
          payload,
          public_key: envelope.publicKey!,
          signature: envelope.signature,
        };
      }

      case 'nep413': {
        const message = buildNep413Message({ signerId, deadline });
        const payload = { message, nonce, recipient: INTENTS_CONTRACT };
        const envelope = await signNep413({
          payload,
          getProvider: requireProvider(providers.near, 'NEAR'),
          expectedAccountId: address,
        });

        return {
          standard: 'nep413',
          payload,
          public_key: envelope.publicKey!,
          signature: envelope.signature,
        };
      }

      default:
        throw new OwnershipError(
          'UNSUPPORTED_STANDARD',
          `ownership proofs are not supported for ${signingStandard}`,
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
