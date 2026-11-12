import { base64 } from '@scure/base';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assertPreparedIntent,
  assertSwapTransferPayload,
  FundingError,
  signPreparedIntent,
  type SwapTransferExpectation,
} from '@/funding';
import type { FetchLike } from '@/http';
import type { PreparedIntent } from '@/intentsApi/types';
import { resetDeadNearRpcUrls } from '@/near/rpc';

const EVM_ADDRESS = '0xCA67c1bb3fD69857E5EdAF6aA1C65371bF46A464';
const EVM_SIGNER = EVM_ADDRESS.toLowerCase();
const SOL_ADDRESS = 'CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq';
const RPC = 'https://rpc.example.test';
const TOKEN =
  'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near';

const transferJson = ({
  signer = EVM_SIGNER,
  receiver = 'deposit.near',
  tokens = { [TOKEN]: '1000000' } as Record<string, string>,
  extra = [] as unknown[],
} = {}) =>
  JSON.stringify({
    signer_id: signer,
    verifying_contract: 'intents.near',
    deadline: '2026-11-02T12:15:00.000Z',
    nonce: 'n',
    intents: [{ intent: 'transfer', receiver_id: receiver, tokens }, ...extra],
  });

const expected = (
  overrides: Partial<SwapTransferExpectation> = {},
): SwapTransferExpectation => ({
  signerId: EVM_SIGNER,
  depositAddress: 'deposit.near',
  tokenId: TOKEN,
  amount: '1000000',
  rail: 'INTENTS',
  ...overrides,
});

const evmWallet = (signature = `0x${'11'.repeat(64)}1c`) => {
  const request = vi.fn(async ({ method }: { method: string }) =>
    method === 'eth_requestAccounts' ? [EVM_ADDRESS] : signature,
  );

  return {
    request,
    wallet: {
      signingStandard: 'erc191' as const,
      getAddress: () => EVM_ADDRESS,
      getProviders: () => ({ evm: { request } }),
    },
  };
};

const bytes = (value: unknown) =>
  Array.from(new TextEncoder().encode(JSON.stringify(value)));

/** NEAR RPC answering `has_public_key`. */
const keyRpc = (registered: boolean) =>
  vi.fn<FetchLike>(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ result: { result: bytes(registered) } }),
  }));

const nearWallet = (accountId: string, publicKey = 'ed25519:Key') => {
  const signMessage = vi.fn(async (_args: unknown) => ({
    accountId,
    publicKey,
    signature: base64.encode(new Uint8Array(64).fill(9)),
  }));

  return {
    signMessage,
    wallet: {
      signingStandard: 'nep413' as const,
      getAddress: () => accountId,
      getPublicKey: () => publicKey,
      getProviders: () => ({ near: () => ({ signMessage }) }),
    },
  };
};

const nep413Intent = (
  message: string,
  callbackUrl: string | null = null,
): PreparedIntent => ({
  standard: 'nep413',
  payload: {
    message,
    nonce: base64.encode(new Uint8Array(32).fill(1)),
    recipient: 'intents.near',
    callbackUrl,
  },
});

beforeEach(() => {
  resetDeadNearRpcUrls();
});

describe('assertPreparedIntent', () => {
  it('accepts a payload of the expected standard', () => {
    expect(() =>
      assertPreparedIntent({ standard: 'erc191', payload: '{}' }, 'erc191'),
    ).not.toThrow();
  });

  it.each([
    [undefined],
    [{ standard: 'nep413', payload: '{}' }],
    [{ standard: 'erc191', payload: { message: 'x' } }],
  ])('refuses %j for an erc191 wallet', (intent) => {
    expect(() => assertPreparedIntent(intent, 'erc191')).toThrow(FundingError);
  });
});

describe('assertSwapTransferPayload', () => {
  const erc191 = (json: string): PreparedIntent => ({
    standard: 'erc191',
    payload: json,
  });

  it('accepts exactly the expected transfer', () => {
    expect(() =>
      assertSwapTransferPayload(erc191(transferJson()), expected()),
    ).not.toThrow();
  });

  it.each([
    ['another signer', { signer: '0xother' }],
    ['another receiver', { receiver: 'attacker.near' }],
    ['another amount', { tokens: { [TOKEN]: '2000000' } }],
    ['another token', { tokens: { 'nep141:wrap.near': '1000000' } }],
    ['an extra token', { tokens: { [TOKEN]: '1000000', 'nep141:x': '1' } }],
    ['an extra intent', { extra: [{ intent: 'ft_withdraw' }] }],
  ])('refuses %s', (_label, change) => {
    const error = (() => {
      try {
        assertSwapTransferPayload(erc191(transferJson(change)), expected());
      } catch (e) {
        return e;
      }

      return undefined;
    })();

    expect(error).toMatchObject({ code: 'PAYLOAD_MISMATCH' });
  });

  it('reads the NEP-413 message', () => {
    expect(() =>
      assertSwapTransferPayload(
        nep413Intent(transferJson({ signer: 'alice.near' })),
        expected({ signerId: 'alice.near' }),
      ),
    ).not.toThrow();
  });

  it('checks only signer and receiver on the confidential rail', () => {
    const rail = 'CONFIDENTIAL_INTENTS' as const;
    const json = transferJson({ extra: [{ intent: 'something_new' }] });

    expect(() =>
      assertSwapTransferPayload(erc191(json), expected({ rail })),
    ).not.toThrow();
    expect(() =>
      assertSwapTransferPayload(
        erc191(transferJson({ receiver: 'attacker.near' })),
        expected({ rail }),
      ),
    ).toThrow(FundingError);
  });

  it('refuses a payload that is not JSON', () => {
    expect(() =>
      assertSwapTransferPayload(erc191('not json'), expected()),
    ).toThrow(FundingError);
  });
});

describe('signPreparedIntent', () => {
  it('signs an erc191 payload verbatim', async () => {
    const { wallet, request } = evmWallet();
    const payload = transferJson();

    const signed = await signPreparedIntent(
      wallet,
      { standard: 'erc191', payload },
      { expect: expected() },
    );

    expect(signed).toMatchObject({ standard: 'erc191', payload });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'personal_sign',
        params: [payload, EVM_ADDRESS],
      }),
    );
  });

  it('signs the UTF-8 bytes of a raw_ed25519 payload', async () => {
    const signMessage = vi.fn(async (_message: Uint8Array) =>
      new Uint8Array(64).fill(7),
    );

    const payload = transferJson({ signer: 'sol-signer' });

    const signed = await signPreparedIntent(
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
      { standard: 'raw_ed25519', payload },
    );

    expect(new TextDecoder().decode(signMessage.mock.calls[0]![0])).toBe(
      payload,
    );
    expect(signed).toMatchObject({
      standard: 'raw_ed25519',
      payload,
      public_key: `ed25519:${SOL_ADDRESS}`,
    });
  });

  it('passes the NEP-413 nonce to the wallet as raw bytes', async () => {
    const { wallet, signMessage } = nearWallet('a'.repeat(64));
    const prepared = nep413Intent(transferJson({ signer: 'a'.repeat(64) }));

    const signed = await signPreparedIntent(wallet, prepared);

    const call = signMessage.mock.calls[0]![0] as { nonce: Uint8Array };

    expect(call.nonce).toBeInstanceOf(Uint8Array);
    expect(call.nonce).toHaveLength(32);
    expect(signed).toMatchObject({
      standard: 'nep413',
      public_key: 'ed25519:Key',
    });
  });

  it('refuses a NEP-413 callbackUrl before prompting', async () => {
    const { wallet, signMessage } = nearWallet('a'.repeat(64));

    await expect(
      signPreparedIntent(
        wallet,
        nep413Intent(transferJson(), 'https://cb.example'),
      ),
    ).rejects.toMatchObject({ code: 'PAYLOAD_MISMATCH' });
    expect(signMessage).not.toHaveBeenCalled();
  });

  it("refuses a named NEAR account whose key isn't registered, before prompting", async () => {
    const { wallet, signMessage } = nearWallet('alice.near');

    await expect(
      signPreparedIntent(
        wallet,
        nep413Intent(transferJson({ signer: 'alice.near' })),
        { rpcUrls: [RPC], fetch: keyRpc(false) },
      ),
    ).rejects.toMatchObject({ code: 'PUBLIC_KEY_NOT_REGISTERED' });
    expect(signMessage).not.toHaveBeenCalled();
  });

  it('signs for a named NEAR account with a registered key', async () => {
    const { wallet, signMessage } = nearWallet('alice.near');

    await signPreparedIntent(
      wallet,
      nep413Intent(transferJson({ signer: 'alice.near' })),
      { rpcUrls: [RPC], fetch: keyRpc(true) },
    );

    expect(signMessage).toHaveBeenCalledTimes(1);
  });

  it('never prompts for a mismatched transfer', async () => {
    const { wallet, request } = evmWallet();

    await expect(
      signPreparedIntent(
        wallet,
        { standard: 'erc191', payload: transferJson({ receiver: 'x.near' }) },
        { expect: expected() },
      ),
    ).rejects.toMatchObject({ code: 'PAYLOAD_MISMATCH' });
    expect(request).not.toHaveBeenCalled();
  });

  it('maps a declined prompt to USER_REJECTED', async () => {
    const { wallet, request } = evmWallet();

    request.mockRejectedValue({ code: 4001, message: 'User rejected' });

    await expect(
      signPreparedIntent(wallet, { standard: 'erc191', payload: '{}' }),
    ).rejects.toMatchObject({ name: 'FundingError', code: 'USER_REJECTED' });
  });

  it('refuses a standard it cannot sign, and a standard the wallet does not use', async () => {
    const { wallet } = evmWallet();

    await expect(
      signPreparedIntent(wallet, { standard: 'sep53', payload: '{}' }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_STANDARD' });
    await expect(
      signPreparedIntent(wallet, { standard: 'raw_ed25519', payload: '{}' }),
    ).rejects.toMatchObject({ code: 'PAYLOAD_MISMATCH' });
  });
});
