import { base64 } from '@scure/base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FetchLike } from '@/http';
import { resetDeadNearRpcUrls } from '@/near/rpc';
import {
  buildIntentPayload,
  buildNep413Message,
  invalidateSalt,
} from '@/ownership';
import type { OwnershipProof } from '@/ownership/types';
import { memoryStorage } from '@/storage';
import {
  createVerificationStore,
  VERIFIED_WALLETS_STORAGE_KEY,
  verifyWallet,
} from '@/verification';

const ACCOUNT = '0xCA67c1bb3fD69857E5EdAF6aA1C65371bF46A464';
const RPC = 'https://rpc.example.test';

const erc191Proof = (signerId: string): OwnershipProof => ({
  standard: 'erc191',
  payload: buildIntentPayload({
    signerId,
    deadline: new Date(0),
    nonce: 'N',
  }),
  signature: 'secp256k1:s',
});

const evmWallet = (address = ACCOUNT) => ({
  signingStandard: 'erc191' as const,
  getAddress: () => address,
  getProviders: () => ({
    evm: {
      request: async ({ method }: { method: string }) =>
        method === 'eth_requestAccounts' ? [address] : `0x${'11'.repeat(65)}`,
    },
  }),
});

/** current_salt answers, simulate_intents answers `simulate`. */
const rpc = (simulate: { error?: string }) =>
  vi.fn<FetchLike>(async (_url, init) => {
    const { params } = JSON.parse(init!.body!) as {
      params: { method_name: string };
    };

    const value =
      params.method_name === 'current_salt' ? '0a0b0c0d' : { ok: true };

    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          result:
            params.method_name === 'simulate_intents' && simulate.error
              ? { error: simulate.error }
              : {
                  result: Array.from(
                    new TextEncoder().encode(JSON.stringify(value)),
                  ),
                },
        }),
    };
  });

beforeEach(() => {
  invalidateSalt();
  resetDeadNearRpcUrls();
});

describe('createVerificationStore', () => {
  it('records a verified proof and recognises the wallet', async () => {
    const store = createVerificationStore({ storage: memoryStorage() });

    expect(store.isVerified(evmWallet())).toBe(false);

    await store.markVerified(erc191Proof(ACCOUNT.toLowerCase()));

    expect(store.isVerified(evmWallet())).toBe(true);
    expect(
      store.isVerified(evmWallet('0x1111111111111111111111111111111111111111')),
    ).toBe(false);
  });

  it('persists and hydrates across instances', async () => {
    const storage = memoryStorage();

    await createVerificationStore({ storage }).markVerified(
      erc191Proof(ACCOUNT.toLowerCase()),
    );

    const next = createVerificationStore({ storage });

    expect(next.isVerified(evmWallet())).toBe(false);

    await next.hydrate();

    expect(next.state.hydrated).toBe(true);
    expect(next.isVerified(evmWallet())).toBe(true);
    expect(await storage.get(VERIFIED_WALLETS_STORAGE_KEY)).toContain(
      'erc191:0xca67',
    );
  });

  it('keys NEP-413 records by public key', async () => {
    const store = createVerificationStore({ storage: memoryStorage() });

    await store.markVerified({
      standard: 'nep413',
      payload: {
        message: buildNep413Message({
          signerId: 'alice.near',
          deadline: new Date(0),
        }),
        nonce: base64.encode(new Uint8Array(32)),
        recipient: 'intents.near',
      },
      public_key: 'ed25519:KeyA',
      signature: 'ed25519:s',
    });

    const near = (publicKey?: string) => ({
      signingStandard: 'nep413' as const,
      getAddress: () => 'alice.near',
      getPublicKey: () => publicKey,
    });

    expect(store.isVerified(near('ed25519:KeyA'))).toBe(true);
    expect(store.isVerified(near('ed25519:KeyB'))).toBe(false);
    expect(store.isVerified(near(undefined))).toBe(false);
  });

  it('clears records', async () => {
    const storage = memoryStorage();
    const store = createVerificationStore({ storage });

    await store.markVerified(erc191Proof(ACCOUNT.toLowerCase()));
    await store.clear();

    expect(store.isVerified(evmWallet())).toBe(false);
    expect(await storage.get(VERIFIED_WALLETS_STORAGE_KEY)).toBeUndefined();
  });
});

describe('verifyWallet', () => {
  it('records a passing wallet and returns the proof for reuse', async () => {
    const store = createVerificationStore({ storage: memoryStorage() });

    const { verdict, proof } = await verifyWallet(evmWallet(), {
      store,
      rpcUrls: [RPC],
      fetch: rpc({}),
    });

    expect(verdict).toEqual({ ok: true });
    expect(proof.standard).toBe('erc191');
    expect(store.isVerified(evmWallet())).toBe(true);
  });

  it('does not record a rejected wallet', async () => {
    const store = createVerificationStore({ storage: memoryStorage() });

    const { verdict } = await verifyWallet(evmWallet(), {
      store,
      rpcUrls: [RPC],
      fetch: rpc({ error: 'invalid signature' }),
    });

    expect(verdict).toMatchObject({ ok: false, reason: 'SIGNATURE_REJECTED' });
    expect(store.isVerified(evmWallet())).toBe(false);
  });
});
