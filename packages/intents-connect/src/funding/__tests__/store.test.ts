import { describe, expect, it } from 'vitest';

import {
  createFundingStore,
  FUNDING_STORAGE_KEY_PREFIX,
  type FundingRecord,
  getActiveFunding,
} from '@/funding';
import { memoryStorage } from '@/storage';

const ACCOUNT = '0xabc';
const DAY = 24 * 60 * 60_000;

const record = (
  id: string,
  overrides: Partial<FundingRecord> = {},
): FundingRecord => ({
  v: 1,
  id,
  intentsAccountId: ACCOUNT,
  walletAddress: ACCOUNT,
  source: 'intents',
  originAsset: 'nep141:usdc',
  amountIn: '1',
  destination: { chain: 'monad', assetId: 'nep245:usdc', tokenAddress: '0x1' },
  recipient: '0xintermediary',
  depositAddress: id,
  quote: { amountOut: '1', minAmountOut: '1', timeEstimate: 10 },
  correlationId: 'c',
  stage: 'quoted',
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

describe('createFundingStore', () => {
  it('persists records per account and reloads them', async () => {
    const storage = memoryStorage();
    const store = createFundingStore({ storage, now: () => 2000 });

    await store.put(record('a'));
    await store.put(record('b', { createdAt: 1500 }));

    const reloaded = createFundingStore({ storage, now: () => 2000 });

    expect((await reloaded.load(ACCOUNT)).map((r) => r.id)).toEqual(['b', 'a']);
    expect(
      JSON.parse(
        String(await storage.get(`${FUNDING_STORAGE_KEY_PREFIX}${ACCOUNT}`)),
      ),
    ).toHaveLength(2);
  });

  it('replaces a record by id', async () => {
    const store = createFundingStore({ storage: memoryStorage() });

    await store.put(record('a'));
    await store.put(record('a', { stage: 'submitted' }));

    expect(store.state.records[ACCOUNT]?.map((r) => r.stage)).toEqual([
      'submitted',
    ]);
  });

  it('ignores corrupt storage', async () => {
    const storage = memoryStorage();

    await storage.set(`${FUNDING_STORAGE_KEY_PREFIX}${ACCOUNT}`, '{nope');
    await storage.set(`${FUNDING_STORAGE_KEY_PREFIX}other`, '[{"v":2}]');

    const store = createFundingStore({ storage });

    await expect(store.load(ACCOUNT)).resolves.toEqual([]);
    await expect(store.load('other')).resolves.toEqual([]);
  });

  it('drops old finished records but never a live one', async () => {
    const storage = memoryStorage();
    const now = 30 * DAY;
    const store = createFundingStore({ storage, now: () => now });

    await store.put(record('live', { createdAt: 1, updatedAt: 1 }));
    await store.put(
      record('stale', { stage: 'done', createdAt: 2, updatedAt: 2 }),
    );

    for (let index = 0; index < 12; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await store.put(
        record(`done-${index}`, {
          stage: 'refunded',
          createdAt: now - index,
          updatedAt: now - index,
        }),
      );
    }

    const ids = (await store.load(ACCOUNT)).map((r) => r.id);

    expect(ids).toHaveLength(10);
    expect(ids).toContain('live');
    expect(ids).not.toContain('stale');
  });

  it('finds the funding still in progress', async () => {
    const store = createFundingStore({ storage: memoryStorage() });

    await store.put(record('done', { stage: 'done' }));

    expect(getActiveFunding(await store.load(ACCOUNT))).toBeUndefined();

    await store.put(record('live', { stage: 'submitted', createdAt: 2000 }));

    expect(getActiveFunding(store.state.records[ACCOUNT])?.id).toBe('live');
  });

  it('removes a record', async () => {
    const store = createFundingStore({ storage: memoryStorage() });

    await store.put(record('a'));
    await store.remove(ACCOUNT, 'a');

    await expect(store.load(ACCOUNT)).resolves.toEqual([]);
  });
});
