import { proxy } from 'valtio/vanilla';

import { type FundingRecord, TERMINAL_FUNDING_STAGES } from '@/funding/types';
import {
  getLocalStorage,
  type KeyValueStorage,
  memoryStorage,
  webStorage,
} from '@/storage';

export const FUNDING_STORAGE_KEY_PREFIX = 'intents-connect.funding:';

/** Per account. Live records are never dropped to make room. */
const MAX_RECORDS = 10;
const TERMINAL_TTL_MS = 7 * 24 * 60 * 60_000;

export type FundingStoreState = {
  /** By intents account id, newest first. */
  records: Record<string, FundingRecord[]>;
};

export type FundingStore = {
  /** A valtio proxy — subscribe to it, or `useSnapshot` it in React. */
  readonly state: FundingStoreState;
  /** The account's records, read from storage once. */
  load: (intentsAccountId: string) => Promise<readonly FundingRecord[]>;
  /** Inserts or replaces a record (by `id`) and persists the account's list. */
  put: (record: FundingRecord) => Promise<void>;
  remove: (intentsAccountId: string, id: string) => Promise<void>;
};

const isTerminal = (record: FundingRecord) =>
  TERMINAL_FUNDING_STAGES.includes(record.stage);

/** The funding still in progress, if any — at most one per account. */
export const getActiveFunding = (
  records: readonly FundingRecord[] | undefined,
): FundingRecord | undefined => records?.find((record) => !isTerminal(record));

const isRecord = (value: unknown): value is FundingRecord => {
  const record = value as Partial<FundingRecord> | null;

  return (
    !!record &&
    record.v === 1 &&
    typeof record.id === 'string' &&
    typeof record.stage === 'string' &&
    typeof record.intentsAccountId === 'string' &&
    typeof record.createdAt === 'number'
  );
};

const prune = (records: readonly FundingRecord[], at: number) => {
  const sorted = [...records].sort((a, b) => b.createdAt - a.createdAt);
  const kept = sorted.filter(
    (record) => !isTerminal(record) || at - record.updatedAt < TERMINAL_TTL_MS,
  );

  const live = kept.filter((record) => !isTerminal(record));
  const done = kept
    .filter(isTerminal)
    .slice(0, Math.max(0, MAX_RECORDS - live.length));

  return kept.filter(
    (record) => live.includes(record) || done.includes(record),
  );
};

const defaultStorage = (): KeyValueStorage => {
  const local = getLocalStorage();

  return local ? webStorage(local) : memoryStorage();
};

/**
 * Remembers fundings across reloads, so a transfer already signed is watched
 * to the end — and never signed twice — after the page comes back.
 * `localStorage` by default; the records hold amounts and addresses, not
 * secrets.
 */
export const createFundingStore = ({
  storage = defaultStorage(),
  now = Date.now,
}: { storage?: KeyValueStorage; now?: () => number } = {}): FundingStore => {
  const state = proxy<FundingStoreState>({ records: {} });
  const loading = new Map<string, Promise<readonly FundingRecord[]>>();

  const keyOf = (intentsAccountId: string) =>
    `${FUNDING_STORAGE_KEY_PREFIX}${intentsAccountId}`;

  const persist = (intentsAccountId: string) =>
    storage.set(
      keyOf(intentsAccountId),
      JSON.stringify(state.records[intentsAccountId] ?? []),
    );

  const load = async (intentsAccountId: string) => {
    let pending = loading.get(intentsAccountId);

    if (!pending) {
      pending = Promise.resolve(storage.get(keyOf(intentsAccountId))).then(
        (raw) => {
          let stored: FundingRecord[] = [];

          try {
            const parsed: unknown = raw ? JSON.parse(raw) : [];

            stored = Array.isArray(parsed) ? parsed.filter(isRecord) : [];
          } catch {
            // A corrupt record only loses the history.
          }

          // Anything put while reading wins over what was stored.
          const current = state.records[intentsAccountId] ?? [];
          const merged = [
            ...current,
            ...stored.filter((record) =>
              current.every((other) => other.id !== record.id),
            ),
          ];

          state.records[intentsAccountId] = prune(merged, now());

          return state.records[intentsAccountId];
        },
      );
      loading.set(intentsAccountId, pending);
    }

    await pending;

    // The list as it is now: puts after the first load replace it.
    return state.records[intentsAccountId] ?? [];
  };

  return {
    state,
    load,

    put: async (record) => {
      await load(record.intentsAccountId);

      const records = state.records[record.intentsAccountId] ?? [];

      state.records[record.intentsAccountId] = prune(
        [record, ...records.filter((other) => other.id !== record.id)],
        now(),
      );
      await persist(record.intentsAccountId);
    },

    remove: async (intentsAccountId, id) => {
      await load(intentsAccountId);

      state.records[intentsAccountId] = (
        state.records[intentsAccountId] ?? []
      ).filter((record) => record.id !== id);
      await persist(intentsAccountId);
    },
  };
};
