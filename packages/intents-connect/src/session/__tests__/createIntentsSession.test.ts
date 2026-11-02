import { describe, expect, it, vi } from 'vitest';

import { IntentsApiError } from '@/errors';
import type { AuthenticateResult, IntentsApi } from '@/intentsApi/types';
import { buildIntentPayload } from '@/ownership/payload';
import type { OwnershipProof } from '@/ownership/types';
import {
  createIntentsSession,
  SESSION_STORAGE_KEY_PREFIX,
  SessionError,
} from '@/session';
import { memoryStorage, webStorage } from '@/storage';

const ACCOUNT = '0xca67c1bb3fd69857e5edaf6aa1c65371bf46a464';
const OTHER = '0x1111111111111111111111111111111111111111';

const proofFor = (
  signerId: string,
  standard: 'erc191' | 'raw_ed25519' = 'erc191',
): OwnershipProof => {
  const payload = buildIntentPayload({
    signerId,
    deadline: new Date(0),
    nonce: 'N',
  });

  return standard === 'erc191'
    ? { standard, payload, signature: 'secp256k1:s' }
    : { standard, payload, public_key: 'ed25519:k', signature: 'ed25519:s' };
};

const wallet = (address = ACCOUNT) => ({
  signingStandard: 'erc191' as const,
  getAddress: () => address,
  getProviders: () => ({}),
});

const fakeApi = (overrides: Partial<IntentsApi> = {}) => {
  let issued = 0;

  const api: IntentsApi = {
    apiKey: 'k',
    baseUrl: 'https://x.test',
    nearRpcUrl: 'https://x.test/rpc/k',
    getTokens: vi.fn(),
    getIntentsAccountBalances: vi.fn(),
    authenticate: vi.fn(async () => {
      issued += 1;

      return {
        accessToken: `access-${issued}`,
        refreshToken: `refresh-${issued}`,
        expiresIn: 900,
        refreshExpiresIn: 604800,
      };
    }),
    refreshAccessToken: vi.fn(async () => {
      issued += 1;

      return { accessToken: `access-${issued}`, expiresIn: 900 };
    }),
    getConfidentialBalances: vi.fn(async () => ({ balances: [] })),
    ...overrides,
  };

  return api;
};

const clock = (start = 1_000_000) => {
  let time = start;

  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
  };
};

describe('authorize', () => {
  it('exchanges a proof for a session and persists it', async () => {
    const api = fakeApi();
    const storage = memoryStorage();
    const { now } = clock();
    const session = createIntentsSession({ intentsApi: api, storage, now });

    await session.authorize(wallet(), { proof: proofFor(ACCOUNT) });

    expect(api.authenticate).toHaveBeenCalledWith(proofFor(ACCOUNT));
    expect(session.state).toMatchObject({
      status: 'authorized',
      intentsAccountId: ACCOUNT,
      accessTokenExpiresAt: 1_000_000 + 900_000,
      refreshTokenExpiresAt: 1_000_000 + 604_800_000,
    });
    await expect(session.getAccessToken()).resolves.toBe('access-1');
    expect(
      JSON.parse(
        (await storage.get(`${SESSION_STORAGE_KEY_PREFIX}${ACCOUNT}`))!,
      ),
    ).toMatchObject({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  });

  it('never puts tokens in observable state', async () => {
    const session = createIntentsSession({ intentsApi: fakeApi() });

    await session.authorize(wallet(), { proof: proofFor(ACCOUNT) });

    expect(JSON.stringify(session.state)).not.toContain('access-1');
    expect(JSON.stringify(session.state)).not.toContain('refresh-1');
  });

  it('maps a 401 to SIGNATURE_REJECTED and stays anonymous', async () => {
    const api = fakeApi({
      authenticate: vi.fn(async () => {
        throw new IntentsApiError('Signature verification failed', 401);
      }),
    });

    const session = createIntentsSession({ intentsApi: api });

    const error = await session
      .authorize(wallet(), { proof: proofFor(ACCOUNT) })
      .catch((e: unknown) => e);

    expect((error as SessionError).code).toBe('SIGNATURE_REJECTED');
    expect(session.state.status).toBe('anonymous');
    expect(session.state.error).toBe(error);
  });

  it('maps a timestamp rejection to CLOCK_SKEW', async () => {
    const api = fakeApi({
      authenticate: vi.fn(async () => {
        throw new IntentsApiError('timestamp validation failed', 400);
      }),
    });

    const session = createIntentsSession({ intentsApi: api });

    const error = await session
      .authorize(wallet(), { proof: proofFor(ACCOUNT) })
      .catch((e: unknown) => e);

    expect((error as SessionError).code).toBe('CLOCK_SKEW');
  });

  it('names a Solana proof the proxy does not accept yet', async () => {
    const api = fakeApi({
      authenticate: vi.fn(async () => {
        throw new IntentsApiError('body/signedData Invalid input', 400);
      }),
    });

    const session = createIntentsSession({ intentsApi: api });

    const error = await session
      .authorize(wallet(), { proof: proofFor(ACCOUNT, 'raw_ed25519') })
      .catch((e: unknown) => e);

    expect((error as SessionError).code).toBe('UNSUPPORTED_STANDARD');
  });

  it('refuses a wallet without an account', async () => {
    const session = createIntentsSession({ intentsApi: fakeApi() });

    const error = await session
      .authorize({ ...wallet(), getAddress: () => undefined })
      .catch((e: unknown) => e);

    expect((error as SessionError).code).toBe('WALLET_NOT_CONNECTED');
  });

  it('drops a result that lands after the account changed', async () => {
    let finish: () => void = () => {};
    const api = fakeApi({
      authenticate: vi.fn(
        () =>
          new Promise<AuthenticateResult>((resolve) => {
            finish = () =>
              resolve({
                accessToken: 'late',
                refreshToken: 'late',
                expiresIn: 900,
                refreshExpiresIn: 604800,
              });
          }),
      ),
    });

    const session = createIntentsSession({ intentsApi: api });

    const pending = session.authorize(wallet(), { proof: proofFor(ACCOUNT) });

    await Promise.resolve();
    await session.restore(OTHER);
    finish();
    await pending;

    expect(session.state).toMatchObject({
      status: 'anonymous',
      intentsAccountId: OTHER,
    });
    await expect(session.getAccessToken()).rejects.toBeInstanceOf(SessionError);
  });
});

describe('access tokens', () => {
  it('refreshes within a minute of expiry, once for concurrent callers', async () => {
    const api = fakeApi();
    const time = clock();
    const session = createIntentsSession({ intentsApi: api, now: time.now });

    await session.authorize(wallet(), { proof: proofFor(ACCOUNT) });
    time.advance(900_000 - 30_000);

    const tokens = await Promise.all([
      session.getAccessToken(),
      session.getAccessToken(),
    ]);

    expect(tokens).toEqual(['access-2', 'access-2']);
    expect(api.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(api.refreshAccessToken).toHaveBeenCalledWith('refresh-1');
    expect(session.state.accessTokenExpiresAt).toBe(time.now() + 900_000);
  });

  it('expires the session when the refresh token is rejected', async () => {
    const storage = memoryStorage();
    const api = fakeApi({
      refreshAccessToken: vi.fn(async () => {
        throw new IntentsApiError('Invalid or expired refresh token', 401);
      }),
    });

    const time = clock();
    const session = createIntentsSession({
      intentsApi: api,
      storage,
      now: time.now,
    });

    await session.authorize(wallet(), { proof: proofFor(ACCOUNT) });
    time.advance(900_000);

    await expect(session.getAccessToken()).rejects.toMatchObject({
      code: 'NOT_AUTHORIZED',
    });
    expect(session.state.status).toBe('expired');
    expect(
      await storage.get(`${SESSION_STORAGE_KEY_PREFIX}${ACCOUNT}`),
    ).toBeUndefined();
  });

  it('expires without a network call once the refresh token is past due', async () => {
    const api = fakeApi();
    const time = clock();
    const session = createIntentsSession({ intentsApi: api, now: time.now });

    await session.authorize(wallet(), { proof: proofFor(ACCOUNT) });
    time.advance(604_800_000);

    await expect(session.getAccessToken()).rejects.toBeInstanceOf(SessionError);
    expect(api.refreshAccessToken).not.toHaveBeenCalled();
    expect(session.state.status).toBe('expired');
  });
});

describe('confidential balances', () => {
  it('sends the access token', async () => {
    const api = fakeApi();
    const session = createIntentsSession({ intentsApi: api });

    await session.authorize(wallet(), { proof: proofFor(ACCOUNT) });
    await session.getConfidentialBalances(['nep141:a']);

    expect(api.getConfidentialBalances).toHaveBeenCalledWith('access-1', [
      'nep141:a',
    ]);
  });

  it('refreshes and retries once after a 401', async () => {
    const getConfidentialBalances = vi
      .fn()
      .mockRejectedValueOnce(new IntentsApiError('expired', 401))
      .mockResolvedValueOnce({ balances: [{ tokenId: 't' }] });

    const api = fakeApi({ getConfidentialBalances });
    const session = createIntentsSession({ intentsApi: api });

    await session.authorize(wallet(), { proof: proofFor(ACCOUNT) });

    await expect(session.getConfidentialBalances()).resolves.toEqual({
      balances: [{ tokenId: 't' }],
    });
    expect(getConfidentialBalances.mock.calls.map(([token]) => token)).toEqual([
      'access-1',
      'access-2',
    ]);
  });

  it('rejects without a session', async () => {
    const session = createIntentsSession({ intentsApi: fakeApi() });

    await expect(session.getConfidentialBalances()).rejects.toMatchObject({
      code: 'NOT_AUTHORIZED',
    });
  });
});

describe('restore and logout', () => {
  it('restores a stored session for the account', async () => {
    const storage = memoryStorage();
    const time = clock();
    const first = createIntentsSession({
      intentsApi: fakeApi(),
      storage,
      now: time.now,
    });

    await first.authorize(wallet(), { proof: proofFor(ACCOUNT) });

    const second = createIntentsSession({
      intentsApi: fakeApi(),
      storage,
      now: time.now,
    });

    await second.restore(ACCOUNT);

    expect(second.state.status).toBe('authorized');
    await expect(second.getAccessToken()).resolves.toBe('access-1');

    await second.restore(OTHER);

    expect(second.state).toMatchObject({
      status: 'anonymous',
      intentsAccountId: OTHER,
    });
  });

  it('reports an expired stored session', async () => {
    const storage = memoryStorage();
    const time = clock();
    const session = createIntentsSession({
      intentsApi: fakeApi(),
      storage,
      now: time.now,
    });

    await session.authorize(wallet(), { proof: proofFor(ACCOUNT) });
    time.advance(604_800_001);
    await session.restore(ACCOUNT);

    expect(session.state.status).toBe('expired');
  });

  it('ignores a corrupt stored value', async () => {
    const storage = memoryStorage();

    await storage.set(`${SESSION_STORAGE_KEY_PREFIX}${ACCOUNT}`, '{not json');

    const session = createIntentsSession({ intentsApi: fakeApi(), storage });

    await session.restore(ACCOUNT);

    expect(session.state.status).toBe('anonymous');
  });

  it('forgets the session on logout', async () => {
    const storage = memoryStorage();
    const session = createIntentsSession({ intentsApi: fakeApi(), storage });

    await session.authorize(wallet(), { proof: proofFor(ACCOUNT) });
    await session.logout();

    expect(session.state.status).toBe('anonymous');
    expect(
      await storage.get(`${SESSION_STORAGE_KEY_PREFIX}${ACCOUNT}`),
    ).toBeUndefined();
    await expect(session.getAccessToken()).rejects.toBeInstanceOf(SessionError);
  });
});

describe('webStorage', () => {
  it('prefixes keys and survives a throwing storage', () => {
    const backing = new Map<string, string>();
    const storage = webStorage(
      {
        getItem: (key) => backing.get(key) ?? null,
        setItem: (key, value) => {
          backing.set(key, value);
        },
        removeItem: (key) => {
          backing.delete(key);
        },
      },
      { prefix: 'app.' },
    );

    storage.set('a', '1');

    expect(backing.get('app.a')).toBe('1');
    expect(storage.get('a')).toBe('1');

    const blocked = webStorage({
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    });

    expect(blocked.get('a')).toBe(null);
    expect(() => blocked.set('a', '1')).not.toThrow();
    expect(() => blocked.remove('a')).not.toThrow();
    expect(webStorage(undefined).get('a')).toBe(null);
  });
});
