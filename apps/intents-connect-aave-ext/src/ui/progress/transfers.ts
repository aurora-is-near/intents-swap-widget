/**
 * Supplies paid by a transfer, remembered from their creation: the service
 * doesn't say how a run is funded, and a found transfer must be resumed
 * without a wallet deposit.
 */
const KEY = 'aurora-intents.transfers';

/** Longer than any transfer waits (30 min, plus the service's grace). */
const KEEP_MS = 24 * 60 * 60_000;

export type SavedTransfer = {
  /** Execution id. */
  id: string;
  /** The signing wallet's address: runs are filed under it. */
  address: string;
  /** 1Click asset id of what is sent. */
  originAssetId: string;
  /**
   * Its chain slug: a resume needs it for an asset id that doesn't name its
   * chain (`nep245`).
   */
  originChain?: string;
  /** When the deposit address stops taking funds (ISO). */
  deadline?: string;
  savedAt: number;
};

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const browserStore = (): Store | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
};

const isSaved = (value: unknown): value is SavedTransfer => {
  const entry = value as Partial<SavedTransfer> | null;

  return (
    typeof entry?.id === 'string' &&
    typeof entry.address === 'string' &&
    typeof entry.originAssetId === 'string' &&
    typeof entry.savedAt === 'number'
  );
};

/** The saved transfers younger than a day. */
export const readTransfers = (
  now: number = Date.now(),
  store: Store | undefined = browserStore(),
): SavedTransfer[] => {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(KEY) ?? '[]');

    return Array.isArray(parsed)
      ? parsed.filter(isSaved).filter((entry) => now - entry.savedAt < KEEP_MS)
      : [];
  } catch {
    return [];
  }
};

const write = (entries: readonly SavedTransfer[], store: Store | undefined) => {
  try {
    store?.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Not remembered: a found run then asks before it resumes.
  }
};

/** Remembers a transfer's run, replacing an entry with the same id. */
export const rememberTransfer = (
  transfer: Omit<SavedTransfer, 'savedAt'>,
  now: number = Date.now(),
  store: Store | undefined = browserStore(),
): void =>
  write(
    [
      ...readTransfers(now, store).filter((entry) => entry.id !== transfer.id),
      { ...transfer, savedAt: now },
    ],
    store,
  );

/** The saved transfer with this execution id, if any. */
export const savedTransfer = (
  id: string | undefined,
  now: number = Date.now(),
  store: Store | undefined = browserStore(),
): SavedTransfer | undefined =>
  id ? readTransfers(now, store).find((entry) => entry.id === id) : undefined;

/** The saved transfers signed by `address`, newest first. */
export const transfersOf = (
  address: string,
  now: number = Date.now(),
  store: Store | undefined = browserStore(),
): SavedTransfer[] =>
  readTransfers(now, store)
    .filter((entry) => entry.address.toLowerCase() === address.toLowerCase())
    .sort((a, b) => b.savedAt - a.savedAt);

/** Forgets one transfer (it finished, or was cancelled). */
export const forgetTransfer = (
  id: string,
  now: number = Date.now(),
  store: Store | undefined = browserStore(),
): void =>
  write(
    readTransfers(now, store).filter((entry) => entry.id !== id),
    store,
  );
