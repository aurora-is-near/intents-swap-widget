import { getFamilyForStandard, getIntentsAccountId } from '@/account';
import type { NearRpcOptions } from '@/near/rpc';
import { OwnershipError } from '@/ownership/errors';
import { createTimestampedNonceBytes, encodeNonce } from '@/ownership/nonce';
import {
  buildIntentPayload,
  buildNep413Message,
  OWNERSHIP_PROOF_TTL_MS,
} from '@/ownership/payload';
import { getCurrentSalt, INTENTS_CONTRACT } from '@/ownership/salt';
import { signMultiPayload } from '@/ownership/signMultiPayload';
import type { OwnershipProof } from '@/ownership/types';
import type { WalletConnector } from '@/types/wallet';

export type SignOwnershipProofOptions = NearRpcOptions & {
  /** Clock, for tests. */
  now?: () => number;
};

/** The standards an ownership proof can be signed with. */
const OWNERSHIP_STANDARDS: ReadonlySet<string> = new Set([
  'erc191',
  'raw_ed25519',
  'nep413',
]);

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

  if (!family || !OWNERSHIP_STANDARDS.has(signingStandard)) {
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

  switch (signingStandard) {
    case 'erc191':
    case 'raw_ed25519':
      return signMultiPayload(wallet, {
        standard: signingStandard,
        payload: buildIntentPayload({ signerId, deadline, nonce }),
      });

    case 'nep413':
      return signMultiPayload(wallet, {
        standard: 'nep413',
        payload: {
          message: buildNep413Message({ signerId, deadline }),
          nonce,
          recipient: INTENTS_CONTRACT,
        },
      });

    default:
      throw new OwnershipError(
        'UNSUPPORTED_STANDARD',
        `ownership proofs are not supported for ${signingStandard}`,
      );
  }
};
