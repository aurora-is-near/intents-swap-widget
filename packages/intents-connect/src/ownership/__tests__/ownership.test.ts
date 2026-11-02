import { base58, base64, hex } from '@scure/base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FetchLike } from '@/http';
import { resetDeadNearRpcUrls } from '@/near/rpc';
import {
  buildIntentPayload,
  buildNep413Message,
  createTimestampedNonceBytes,
  decodeNonce,
  encodeNonce,
  getProofSignerId,
  invalidateSalt,
  OwnershipError,
  type OwnershipProof,
  signOwnershipProof,
  verifyOwnership,
} from '@/ownership';
import type { WalletConnector } from '@/types/wallet';

const NOW = Date.UTC(2026, 10, 2, 12, 0, 0);
const SALT = '0a0b0c0d';
const RPC = 'https://rpc.example.test';

const bytes = (value: unknown) =>
  Array.from(new TextEncoder().encode(JSON.stringify(value)));

type ViewHandler = (
  methodName: string,
  args: Record<string, unknown>,
) => { result?: unknown; error?: string };

/** A NEAR RPC whose view calls are answered by `handle`. */
const rpcFor = (handle: ViewHandler) =>
  vi.fn<FetchLike>(async (_url, init) => {
    const { params } = JSON.parse(init!.body!) as {
      params: { method_name: string; args_base64: string };
    };

    const args = JSON.parse(
      new TextDecoder().decode(base64.decode(params.args_base64)),
    ) as Record<string, unknown>;

    const reply = handle(params.method_name, args);

    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          result:
            reply.error !== undefined
              ? { error: reply.error }
              : { result: bytes(reply.result) },
        }),
    };
  });

const saltOnly = rpcFor((method) =>
  method === 'current_salt' ? { result: SALT } : { error: 'unexpected' },
);

const EVM_ADDRESS = '0xCA67c1bb3fD69857E5EdAF6aA1C65371bF46A464';
const SOL_ADDRESS = 'CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq';

const evmWallet = (signature = `0x${'11'.repeat(64)}1c`) => {
  const request = vi.fn(async ({ method }: { method: string }) => {
    if (method === 'eth_requestAccounts') {
      return [EVM_ADDRESS];
    }

    return signature;
  });

  const wallet: Pick<
    WalletConnector,
    'signingStandard' | 'getAddress' | 'getProviders'
  > = {
    signingStandard: 'erc191',
    getAddress: () => EVM_ADDRESS,
    getProviders: () => ({ evm: { request } }),
  };

  return { wallet, request };
};

beforeEach(() => {
  invalidateSalt();
  resetDeadNearRpcUrls();
});

describe('nonce', () => {
  it('round-trips the versioned layout', () => {
    const salt = hex.decode(SALT);
    const start = new Date(NOW);
    const deadline = new Date(NOW + 300_000);
    const encoded = encodeNonce(
      salt,
      deadline,
      createTimestampedNonceBytes(start),
    );

    const raw = base64.decode(encoded);

    expect(raw).toHaveLength(32);
    expect(Array.from(raw.slice(0, 5))).toEqual([0x56, 0x28, 0xf6, 0xc6, 0]);

    const decoded = decodeNonce(encoded);

    expect(decoded.version).toBe(0);
    expect(hex.encode(decoded.salt)).toBe(SALT);
    expect(decoded.deadlineNs).toBe(BigInt(NOW + 300_000) * 1_000_000n);
    expect(decoded.startTimeNs).toBe(BigInt(NOW) * 1_000_000n);
  });

  it('randomises the 7 trailing bytes', () => {
    const a = createTimestampedNonceBytes(new Date(NOW));
    const b = createTimestampedNonceBytes(new Date(NOW));

    expect(a.slice(0, 8)).toEqual(b.slice(0, 8));
    expect(a.slice(8)).not.toEqual(b.slice(8));
  });

  it('rejects a wrong salt length and a foreign nonce', () => {
    expect(() =>
      encodeNonce(new Uint8Array(3), new Date(), new Uint8Array(15)),
    ).toThrow();
    expect(() => decodeNonce(base64.encode(new Uint8Array(32)))).toThrow(
      /magic/,
    );
  });
});

describe('payloads', () => {
  const deadline = new Date(NOW);

  it('builds the erc191 / raw_ed25519 payload in docs key order', () => {
    expect(
      buildIntentPayload({ signerId: '0xabc', deadline, nonce: 'N' }),
    ).toBe(
      '{"signer_id":"0xabc","verifying_contract":"intents.near","deadline":"2026-11-02T12:00:00.000Z","nonce":"N","intents":[]}',
    );
  });

  it('builds the NEP-413 message without nonce or contract', () => {
    expect(buildNep413Message({ signerId: 'alice.near', deadline })).toBe(
      '{"deadline":"2026-11-02T12:00:00.000Z","intents":[],"signer_id":"alice.near"}',
    );
  });

  it('reads the signer back out of either shape', () => {
    expect(
      getProofSignerId({
        standard: 'erc191',
        payload: buildIntentPayload({
          signerId: '0xabc',
          deadline,
          nonce: 'N',
        }),
        signature: 's',
      }),
    ).toBe('0xabc');
    expect(
      getProofSignerId({
        standard: 'nep413',
        payload: {
          message: buildNep413Message({ signerId: 'bob.near', deadline }),
          nonce: 'N',
          recipient: 'intents.near',
        },
        public_key: 'ed25519:k',
        signature: 's',
      }),
    ).toBe('bob.near');
  });
});

describe('signOwnershipProof', () => {
  it('signs an erc191 proof whose nonce deadline matches the payload', async () => {
    const { wallet, request } = evmWallet();

    const proof = await signOwnershipProof(wallet, {
      rpcUrls: [RPC],
      fetch: saltOnly,
      now: () => NOW,
    });

    expect(proof.standard).toBe('erc191');

    if (proof.standard !== 'erc191') {
      return;
    }

    const payload = JSON.parse(proof.payload) as {
      signer_id: string;
      deadline: string;
      nonce: string;
    };

    expect(payload.signer_id).toBe(EVM_ADDRESS.toLowerCase());
    expect(payload.deadline).toBe('2026-11-02T12:05:00.000Z');

    const nonce = decodeNonce(payload.nonce);

    expect(hex.encode(nonce.salt)).toBe(SALT);
    expect(nonce.deadlineNs).toBe(BigInt(NOW + 300_000) * 1_000_000n);
    expect(nonce.startTimeNs).toBe(BigInt(NOW) * 1_000_000n);

    // personal_sign gets the exact payload string, and v is normalised 28→1.
    expect(request).toHaveBeenCalledWith({
      method: 'personal_sign',
      params: [proof.payload, EVM_ADDRESS],
    });
    expect(proof.signature).toMatch(/^secp256k1:/);
    expect(base58.decode(proof.signature.slice('secp256k1:'.length))[64]).toBe(
      1,
    );
  });

  it('signs the UTF-8 bytes of the payload for raw_ed25519', async () => {
    const signMessage = vi.fn(async (_message: Uint8Array) =>
      new Uint8Array(64).fill(7),
    );

    const proof = await signOwnershipProof(
      {
        signingStandard: 'raw_ed25519',
        getAddress: () => SOL_ADDRESS,
        getProviders: () => ({
          sol: {
            publicKey: { toString: () => SOL_ADDRESS },
            signMessage,
            signTransaction: async (tx: unknown) => tx,
          },
        }),
      },
      { rpcUrls: [RPC], fetch: saltOnly, now: () => NOW },
    );

    expect(proof).toMatchObject({
      standard: 'raw_ed25519',
      public_key: `ed25519:${SOL_ADDRESS}`,
    });
    expect(new TextDecoder().decode(signMessage.mock.calls[0]![0])).toBe(
      (proof as Extract<OwnershipProof, { standard: 'raw_ed25519' }>).payload,
    );
  });

  it('signs a NEP-413 proof with the nonce as raw bytes', async () => {
    const signMessage = vi.fn(async (_args: unknown) => ({
      accountId: 'alice.near',
      publicKey: 'ed25519:Key',
      signature: base64.encode(new Uint8Array(64).fill(9)),
    }));

    const proof = await signOwnershipProof(
      {
        signingStandard: 'nep413',
        getAddress: () => 'alice.near',
        getProviders: () => ({ near: () => ({ signMessage }) }),
      },
      { rpcUrls: [RPC], fetch: saltOnly, now: () => NOW },
    );

    if (proof.standard !== 'nep413') {
      throw new Error('expected nep413');
    }

    const call = signMessage.mock.calls[0]![0] as unknown as {
      message: string;
      recipient: string;
      nonce: Uint8Array;
    };

    expect(call.recipient).toBe('intents.near');
    expect(call.message).toBe(proof.payload.message);
    expect(base64.encode(call.nonce)).toBe(proof.payload.nonce);
    expect(proof.public_key).toBe('ed25519:Key');
    expect(proof.signature).toMatch(/^ed25519:/);
  });

  it('refuses a wallet without an address instead of prompting', async () => {
    const { wallet, request } = evmWallet();

    const error = await signOwnershipProof(
      { ...wallet, getAddress: () => undefined },
      { rpcUrls: [RPC], fetch: saltOnly },
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(OwnershipError);
    expect((error as OwnershipError).code).toBe('WALLET_NOT_CONNECTED');
    expect(request).not.toHaveBeenCalled();
  });

  it('refuses a standard it cannot derive an account for', async () => {
    const error = await signOwnershipProof(
      {
        signingStandard: 'sep53',
        getAddress: () => 'GABC',
        getProviders: () => ({}),
      },
      { rpcUrls: [RPC], fetch: saltOnly },
    ).catch((e: unknown) => e);

    expect((error as OwnershipError).code).toBe('UNSUPPORTED_STANDARD');
  });

  it('maps a declined prompt to USER_REJECTED', async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'eth_requestAccounts') {
        return [EVM_ADDRESS];
      }

      throw Object.assign(new Error('User rejected the request.'), {
        code: 4001,
      });
    });

    const error = await signOwnershipProof(
      {
        signingStandard: 'erc191',
        getAddress: () => EVM_ADDRESS,
        getProviders: () => ({ evm: { request } }),
      },
      { rpcUrls: [RPC], fetch: saltOnly },
    ).catch((e: unknown) => e);

    expect((error as OwnershipError).code).toBe('USER_REJECTED');
  });

  it('fetches the salt once for concurrent proofs', async () => {
    const fetchImpl = rpcFor(() => ({ result: SALT }));

    await Promise.all([
      signOwnershipProof(evmWallet().wallet, {
        rpcUrls: [RPC],
        fetch: fetchImpl,
      }),
      signOwnershipProof(evmWallet().wallet, {
        rpcUrls: [RPC],
        fetch: fetchImpl,
      }),
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('verifyOwnership', () => {
  const erc191Proof: OwnershipProof = {
    standard: 'erc191',
    payload: buildIntentPayload({
      signerId: '0xabc',
      deadline: new Date(NOW),
      nonce: 'N',
    }),
    signature: 'secp256k1:s',
  };

  const nep413Proof = (accountId: string): OwnershipProof => ({
    standard: 'nep413',
    payload: {
      message: buildNep413Message({
        signerId: accountId,
        deadline: new Date(NOW),
      }),
      nonce: 'N',
      recipient: 'intents.near',
    },
    public_key: 'ed25519:Key',
    signature: 'ed25519:s',
  });

  it('passes when the simulation succeeds', async () => {
    const fetchImpl = rpcFor((method, args) => {
      expect(method).toBe('simulate_intents');
      expect(args).toEqual({ signed: [erc191Proof] });

      return { result: { intents_executed: [] } };
    });

    await expect(
      verifyOwnership(erc191Proof, { rpcUrls: [RPC], fetch: fetchImpl }),
    ).resolves.toEqual({ ok: true });
  });

  it('reports a rejected signature with the contract message', async () => {
    const fetchImpl = rpcFor(() => ({
      error: 'Smart contract panicked: invalid signature',
    }));

    await expect(
      verifyOwnership(erc191Proof, { rpcUrls: [RPC], fetch: fetchImpl }),
    ).resolves.toEqual({
      ok: false,
      reason: 'SIGNATURE_REJECTED',
      detail: 'Smart contract panicked: invalid signature',
    });
  });

  it('treats a public-key complaint on an EVM proof as a rejected signature', async () => {
    const fetchImpl = rpcFor(() => ({
      error: "public key 'secp256k1:abc' doesn't exist for account '0xabc'",
    }));

    await expect(
      verifyOwnership(erc191Proof, { rpcUrls: [RPC], fetch: fetchImpl }),
    ).resolves.toMatchObject({ ok: false, reason: 'SIGNATURE_REJECTED' });
  });

  it('reports a stale nonce and drops the cached salt', async () => {
    const salts = rpcFor((method) =>
      method === 'current_salt' ? { result: SALT } : { result: null },
    );

    await signOwnershipProof(evmWallet().wallet, {
      rpcUrls: [RPC],
      fetch: salts,
    });

    const verdict = await verifyOwnership(erc191Proof, {
      rpcUrls: [RPC],
      fetch: rpcFor(() => ({ error: 'invalid nonce: salt mismatch' })),
    });

    expect(verdict).toMatchObject({ ok: false, reason: 'NONCE_REJECTED' });

    await signOwnershipProof(evmWallet().wallet, {
      rpcUrls: [RPC],
      fetch: salts,
    });

    expect(salts).toHaveBeenCalledTimes(2);
  });

  it('throws when the RPC itself fails rather than reporting not verified', async () => {
    const down = vi.fn<FetchLike>(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(
      verifyOwnership(erc191Proof, { rpcUrls: [RPC], fetch: down }),
    ).rejects.toThrow(/every endpoint/);
  });

  it('names an unregistered key on a named NEAR account without simulating', async () => {
    const fetchImpl = rpcFor((method, args) => {
      expect(method).toBe('has_public_key');
      expect(args).toEqual({
        account_id: 'alice.near',
        public_key: 'ed25519:Key',
      });

      return { result: false };
    });

    await expect(
      verifyOwnership(nep413Proof('alice.near'), {
        rpcUrls: [RPC],
        fetch: fetchImpl,
      }),
    ).resolves.toEqual({ ok: false, reason: 'PUBLIC_KEY_NOT_REGISTERED' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('simulates an implicit NEAR account without the key check', async () => {
    const methods: string[] = [];
    const fetchImpl = rpcFor((method) => {
      methods.push(method);

      return { result: {} };
    });

    await verifyOwnership(nep413Proof('a'.repeat(64)), {
      rpcUrls: [RPC],
      fetch: fetchImpl,
    });

    expect(methods).toEqual(['simulate_intents']);
  });

  it('falls back to simulation when has_public_key is unavailable', async () => {
    const fetchImpl = rpcFor((method) =>
      method === 'has_public_key'
        ? { error: 'MethodNotFound' }
        : { result: {} },
    );

    await expect(
      verifyOwnership(nep413Proof('alice.near'), {
        rpcUrls: [RPC],
        fetch: fetchImpl,
      }),
    ).resolves.toEqual({ ok: true });
  });
});
