import { proxy } from 'valtio/vanilla';

import { getFamilyForStandard, getIntentsAccountId } from '@/account';
import { getProofSignerId } from '@/ownership/payload';
import type { OwnershipProof } from '@/ownership/types';
import {
  getLocalStorage,
  type KeyValueStorage,
  memoryStorage,
  webStorage,
} from '@/storage';
import type { WalletConnector } from '@/types/wallet';

export const VERIFIED_WALLETS_STORAGE_KEY = 'intents-connect.verifiedWallets';

export type VerificationState = {
  /** `standard:signerId[:publicKey]` → true. A record, so valtio tracks it. */
  verified: Record<string, true>;
  hydrated: boolean;
};

export type VerificationStore = {
  readonly state: VerificationState;
  /** Loads persisted records. Idempotent; call it from an effect. */
  hydrate: () => Promise<void>;
  isVerified: (
    wallet:
      | Pick<WalletConnector, 'signingStandard' | 'getAddress' | 'getPublicKey'>
      | null
      | undefined,
  ) => boolean;
  /** Records the account a passing proof was signed for. */
  markVerified: (proof: OwnershipProof) => Promise<void>;
  clear: () => Promise<void>;
};

/**
 * NEP-413 records include the public key: a NEAR account can hold several
 * keys, and each must be registered with `intents.near` on its own.
 */
const recordKey = (
  standard: string,
  signerId: string,
  publicKey?: string,
): string =>
  standard === 'nep413'
    ? `${standard}:${signerId}:${publicKey ?? ''}`
    : `${standard}:${signerId}`;

const keyForProof = (proof: OwnershipProof): string | undefined => {
  const signerId = getProofSignerId(proof);

  if (!signerId) {
    return undefined;
  }

  return recordKey(
    proof.standard,
    signerId,
    proof.standard === 'nep413' ? proof.public_key : undefined,
  );
};

const defaultStorage = (): KeyValueStorage => {
  const local = getLocalStorage();

  return local ? webStorage(local) : memoryStorage();
};

/**
 * Remembers which wallets passed `verifyWallet`, so a returning user is not
 * asked to sign again. Persists to `localStorage` by default — the record is
 * not a secret, only a hint that skips a prompt.
 *
 * Separate from the swap widget's `sw.verifiedWallets`.
 */
export const createVerificationStore = ({
  storage = defaultStorage(),
  key = VERIFIED_WALLETS_STORAGE_KEY,
}: { storage?: KeyValueStorage; key?: string } = {}): VerificationStore => {
  const state = proxy<VerificationState>({ verified: {}, hydrated: false });

  let hydrating: Promise<void> | undefined;

  const persist = () => storage.set(key, JSON.stringify(state.verified));

  const hydrate = () => {
    hydrating ??= Promise.resolve(storage.get(key)).then((raw) => {
      try {
        const stored = raw ? (JSON.parse(raw) as unknown) : {};

        if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
          Object.keys(stored).forEach((recordId) => {
            state.verified[recordId] = true;
          });
        }
      } catch {
        // A corrupt record only means re-verifying.
      }

      state.hydrated = true;
    });

    return hydrating;
  };

  return {
    state,
    hydrate,

    isVerified: (wallet) => {
      if (!wallet) {
        return false;
      }

      const family = getFamilyForStandard(wallet.signingStandard);
      const signerId = family
        ? getIntentsAccountId({ family, address: wallet.getAddress() })
        : undefined;

      if (!signerId) {
        return false;
      }

      const publicKey = wallet.getPublicKey?.();

      if (wallet.signingStandard === 'nep413' && !publicKey) {
        return false;
      }

      return (
        recordKey(wallet.signingStandard, signerId, publicKey) in state.verified
      );
    },

    markVerified: async (proof) => {
      const recordId = keyForProof(proof);

      if (!recordId) {
        return;
      }

      // Merge with anything persisted before hydration finished.
      await hydrate();
      state.verified[recordId] = true;
      await persist();
    },

    clear: async () => {
      Object.keys(state.verified).forEach((recordId) => {
        delete state.verified[recordId];
      });
      await storage.remove(key);
    },
  };
};
