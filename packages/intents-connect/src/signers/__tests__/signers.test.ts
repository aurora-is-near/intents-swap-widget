import { base58, base64 } from '@scure/base';
import { describe, expect, it, vi } from 'vitest';

import type { Providers } from '@/types/providers';
import type { SigningPayload } from '@/types/signing';
import {
  signIntentsConnectPayload,
  signIntentsConnectText,
} from '@/signers/intentsConnect';

const PAYLOAD_JSON = '{"deadline":"2026-07-30T12:00:00Z","intents":[]}';
const PAYLOAD_BYTES = new TextEncoder().encode(PAYLOAD_JSON);

const payload = (standard: SigningPayload['standard']): SigningPayload => ({
  standard,
  payload_json: PAYLOAD_JSON,
  payload_bytes_base64: base64.encode(PAYLOAD_BYTES),
});

const sig64 = Uint8Array.from({ length: 64 }, (_, i) => i + 1);
const sig65 = (v: number) => Uint8Array.from([...sig64, v]);

const toHex = (bytes: Uint8Array) =>
  `0x${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;

describe('erc191', () => {
  const address = '0xD84368a36ff4F6285F4121ED75E8c1f237E51506';

  const evmProvider = (signature: Uint8Array) => ({
    request: vi.fn(async ({ method }: { method: string }) =>
      method === 'eth_requestAccounts'
        ? [address.toLowerCase()]
        : toHex(signature),
    ),
  });

  it('signs payload_json verbatim and omits publicKey', async () => {
    const provider = evmProvider(sig65(0x1c));

    const result = await signIntentsConnectPayload({
      payload: payload('erc191'),
      standard: 'erc191',
      address,
      providers: { evm: provider } as Providers,
    });

    expect(provider.request).toHaveBeenCalledWith({
      method: 'personal_sign',
      params: [PAYLOAD_JSON, address.toLowerCase()],
    });
    expect(result.signature.startsWith('secp256k1:')).toBe(true);
    // secp256k1 is recoverable, so a publicKey would be rejected by the API.
    expect(result.publicKey).toBeUndefined();
  });

  it('normalises the recovery byte from 28 to 1 without touching r or s', async () => {
    const result = await signIntentsConnectPayload({
      payload: payload('erc191'),
      standard: 'erc191',
      address,
      providers: { evm: evmProvider(sig65(0x1c)) } as Providers,
    });

    const decoded = base58.decode(result.signature.replace('secp256k1:', ''));

    expect(decoded).toHaveLength(65);
    expect(decoded[64]).toBe(1);
    expect(decoded.slice(0, 64)).toEqual(sig64);
  });

  it('normalises 27 to 0', async () => {
    const result = await signIntentsConnectPayload({
      payload: payload('erc191'),
      standard: 'erc191',
      address,
      providers: { evm: evmProvider(sig65(0x1b)) } as Providers,
    });

    expect(base58.decode(result.signature.replace('secp256k1:', ''))[64]).toBe(
      0,
    );
  });

  it('rejects a provider whose account does not match the execution', async () => {
    const provider = {
      request: vi.fn(async () => [
        '0x0000000000000000000000000000000000000000',
      ]),
    };

    await expect(
      signIntentsConnectPayload({
        payload: payload('erc191'),
        standard: 'erc191',
        address,
        providers: { evm: provider } as Providers,
      }),
    ).rejects.toThrow(/does not match/);
  });
});

describe('raw_ed25519', () => {
  const address = '7XSfQk6pYyBGZ3fT8Jd6mR2vNwUq9Lz1AaBbCcDdEeFf';

  it('signs the DECODED payload bytes, not the JSON string', async () => {
    // This is the behavioural difference from the widget's 1Click signer, which
    // signs TextEncoder().encode(payload_json). Signing the wrong source
    // produces a signature the backend rejects with no useful diagnostic.
    const signMessage = vi.fn().mockResolvedValue(sig64);

    await signIntentsConnectPayload({
      payload: payload('raw_ed25519'),
      standard: 'raw_ed25519',
      address,
      providers: {
        sol: { publicKey: { toString: () => address }, signMessage },
      } as unknown as Providers,
    });

    const [signedBytes] = signMessage.mock.calls[0] as [Uint8Array];

    expect(signedBytes).toBeInstanceOf(Uint8Array);
    expect(signedBytes).toEqual(base64.decode(base64.encode(PAYLOAD_BYTES)));
  });

  it('returns base58 signature and publicKey with ed25519 prefixes', async () => {
    const result = await signIntentsConnectPayload({
      payload: payload('raw_ed25519'),
      standard: 'raw_ed25519',
      address,
      providers: {
        sol: {
          publicKey: { toString: () => address },
          signMessage: vi.fn().mockResolvedValue(sig64),
        },
      } as unknown as Providers,
    });

    expect(result.signature).toBe(`ed25519:${base58.encode(sig64)}`);
    expect(result.publicKey).toBe(`ed25519:${address}`);
  });

  it('rejects a signature that is not 64 bytes', async () => {
    await expect(
      signIntentsConnectPayload({
        payload: payload('raw_ed25519'),
        standard: 'raw_ed25519',
        address,
        providers: {
          sol: {
            publicKey: { toString: () => address },
            signMessage: vi.fn().mockResolvedValue(new Uint8Array(32)),
          },
        } as unknown as Providers,
      }),
    ).rejects.toThrow(/64 bytes/);
  });
});

describe('nep413', () => {
  const accountId = 'alice.near';
  const nonceBytes = Uint8Array.from({ length: 32 }, (_, i) => i);

  const nep413Payload: SigningPayload = {
    standard: 'nep413',
    payload_json: JSON.stringify({
      message: 'sign me',
      recipient: 'intents.near',
      nonce: base64.encode(nonceBytes),
    }),
    payload_bytes_base64: base64.encode(PAYLOAD_BYTES),
  };

  it('passes the nonce as 32 raw bytes, not the base64 string', async () => {
    const signMessage = vi.fn().mockResolvedValue({
      accountId,
      publicKey: 'ed25519:pub',
      signature: base64.encode(sig64),
    });

    await signIntentsConnectPayload({
      payload: nep413Payload,
      standard: 'nep413',
      address: accountId,
      providers: { near: () => ({ signMessage }) } as Providers,
    });

    const [args] = signMessage.mock.calls[0] as [{ nonce: Uint8Array }];

    expect(args.nonce).toEqual(nonceBytes);
    expect(args.nonce).toHaveLength(32);
  });

  it('re-encodes a base64 wallet signature to ed25519:base58', async () => {
    const result = await signIntentsConnectPayload({
      payload: nep413Payload,
      standard: 'nep413',
      address: accountId,
      providers: {
        near: () => ({
          signMessage: vi.fn().mockResolvedValue({
            accountId,
            publicKey: 'pub',
            signature: base64.encode(sig64),
          }),
        }),
      } as Providers,
    });

    expect(result.signature).toBe(`ed25519:${base58.encode(sig64)}`);
    // The prefix is added when the wallet omitted it — never twice.
    expect(result.publicKey).toBe('ed25519:pub');
  });

  it('leaves an already-prefixed signature untouched', async () => {
    const result = await signIntentsConnectPayload({
      payload: nep413Payload,
      standard: 'nep413',
      address: accountId,
      providers: {
        near: () => ({
          signMessage: vi.fn().mockResolvedValue({
            accountId,
            publicKey: 'ed25519:pub',
            signature: 'ed25519:already',
          }),
        }),
      } as Providers,
    });

    expect(result.signature).toBe('ed25519:already');
  });
});

describe('sep53', () => {
  const address = 'GABCDEF';
  const publicKeyBytes = Uint8Array.from({ length: 32 }, (_, i) => 255 - i);

  it('takes the publicKey from the injected decodePublicKey, not the G-address', async () => {
    const result = await signIntentsConnectPayload({
      payload: payload('sep53'),
      standard: 'sep53',
      address,
      providers: {
        stellar: {
          signMessage: vi.fn().mockResolvedValue({
            signedMessage: base64.encode(sig64),
            signerAddress: address,
          }),
        },
      } as unknown as Providers,
      decodePublicKey: () => publicKeyBytes,
    });

    expect(result.publicKey).toBe(`ed25519:${base58.encode(publicKeyBytes)}`);
    expect(result.signature).toBe(`ed25519:${base58.encode(sig64)}`);
  });

  it('accepts a Uint8Array signedMessage as well as base64', async () => {
    const result = await signIntentsConnectPayload({
      payload: payload('sep53'),
      standard: 'sep53',
      address,
      providers: {
        stellar: {
          signMessage: vi.fn().mockResolvedValue({
            signedMessage: sig64,
            signerAddress: undefined,
          }),
        },
      } as unknown as Providers,
      decodePublicKey: () => publicKeyBytes,
    });

    expect(result.signature).toBe(`ed25519:${base58.encode(sig64)}`);
  });

  it('fails clearly when decodePublicKey was not supplied', async () => {
    await expect(
      signIntentsConnectPayload({
        payload: payload('sep53'),
        standard: 'sep53',
        address,
        providers: {
          stellar: { signMessage: vi.fn() },
        } as unknown as Providers,
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_SIGNING_STANDARD' });
  });
});

describe('missing providers', () => {
  it('reports a disconnected wallet rather than throwing a type error', async () => {
    await expect(
      signIntentsConnectPayload({
        payload: payload('erc191'),
        standard: 'erc191',
        address: '0xabc',
        providers: {},
      }),
    ).rejects.toMatchObject({ code: 'WALLET_NOT_CONNECTED' });
  });
});

describe('malformed wallet output', () => {
  const address = '0xD84368a36ff4F6285F4121ED75E8c1f237E51506';

  it('rejects a non-hex signature instead of zero-filling it', async () => {
    // parseInt('zz', 16) is NaN, which a Uint8Array stores as 0 — the old code
    // built a well-formed all-zero signature and let the API reject it. No
    // message assertion: @scure/base delegates to the native Uint8Array.fromHex
    // where the runtime has one, and the two paths word their errors
    // differently — rejecting AT ALL is the invariant.
    const provider = {
      request: vi.fn(async ({ method }: { method: string }) =>
        method === 'eth_requestAccounts' ? [address] : `0x${'zz'.repeat(65)}`,
      ),
    };

    await expect(
      signIntentsConnectPayload({
        payload: payload('erc191'),
        standard: 'erc191',
        address,
        providers: { evm: provider } as Providers,
      }),
    ).rejects.toThrow();
  });

  it('rejects an odd-length hex signature', async () => {
    const provider = {
      request: vi.fn(async ({ method }: { method: string }) =>
        method === 'eth_requestAccounts' ? [address] : '0xabc',
      ),
    };

    await expect(
      signIntentsConnectPayload({
        payload: payload('erc191'),
        standard: 'erc191',
        address,
        providers: { evm: provider } as Providers,
      }),
    ).rejects.toThrow();
  });
});

describe('signIntentsConnectText', () => {
  it('signs the bare delete_execution string for erc191', async () => {
    const address = '0xD84368a36ff4F6285F4121ED75E8c1f237E51506';
    const request = vi.fn(async ({ method }: { method: string }) =>
      method === 'eth_requestAccounts' ? [address] : toHex(sig65(0x1b)),
    );

    await signIntentsConnectText({
      text: 'delete_execution:exec-1',
      standard: 'erc191',
      address,
      providers: { evm: { request } } as Providers,
    });

    expect(request).toHaveBeenCalledWith({
      method: 'personal_sign',
      params: ['delete_execution:exec-1', address],
    });
  });

  it('signs nep413 with a fresh 32-byte nonce and returns the delete envelope', async () => {
    const accountId = 'alice.near';
    const signMessage = vi.fn().mockResolvedValue({
      accountId,
      publicKey: 'ed25519:pub',
      signature: base64.encode(sig64),
    });

    const result = await signIntentsConnectText({
      text: 'delete_execution:exec-1',
      standard: 'nep413',
      address: accountId,
      providers: { near: () => ({ signMessage }) } as Providers,
    });

    const [args] = signMessage.mock.calls[0] as [
      { message: string; recipient: string; nonce: Uint8Array },
    ];

    // Recipient is mixed into the signed digest server-side and must be
    // exactly this value; the nonce reaches the wallet as 32 raw bytes.
    expect(args.message).toBe('delete_execution:exec-1');
    expect(args.recipient).toBe('intents.near');
    expect(args.nonce).toHaveLength(32);

    // The wire envelope repeats recipient + nonce (base64) so the backend can
    // rebuild the exact bytes the wallet signed — omitting it is a 400.
    expect(result.nep413).toEqual({
      recipient: 'intents.near',
      nonce: base64.encode(args.nonce),
    });
    expect(result.publicKey).toBe('ed25519:pub');
  });

  it('refuses sep53 — the delete endpoint does not accept it', async () => {
    const signMessage = vi.fn();

    await expect(
      signIntentsConnectText({
        text: 'delete_execution:exec-1',
        standard: 'sep53',
        address: 'GABCDEF',
        providers: { stellar: { signMessage } } as unknown as Providers,
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_SIGNING_STANDARD' });

    // Refused BEFORE the wallet prompt: the backend would reject the delete
    // anyway, so the user must not be asked to sign it.
    expect(signMessage).not.toHaveBeenCalled();
  });
});
