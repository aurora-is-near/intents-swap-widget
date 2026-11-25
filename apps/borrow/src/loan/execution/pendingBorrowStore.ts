/**
 * The borrow in flight per wallet, kept across a reload: the execution's id
 * and the rows its dialog showed, so the pending dialog can reopen as it was.
 * One `localStorage` key holds a record per wallet address. Anything
 * malformed in it is ignored; storage that can't be read or written (private
 * mode, a quota) just means no record.
 */

export const PENDING_BORROW_STORAGE_KEY = 'aurora-borrow-pending';

/** A dialog row: label and value, as the confirm dialog shows them. */
export type PendingBorrowRow = [label: string, value: string];

export type PendingBorrowRecord = {
  executionId: string;
  /** The confirm dialog's summary rows. */
  rows: PendingBorrowRow[];
  /** The borrowed token, named in the last step ("Open the loan and deliver …"). */
  borrowSymbol?: string;
};

type Records = Record<string, PendingBorrowRecord>;

/** EVM addresses in any case are one wallet; other families keep theirs. */
const walletKey = (address: string) =>
  address.startsWith('0x') ? address.toLowerCase() : address;

const isRow = (value: unknown): value is PendingBorrowRow =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === 'string' &&
  typeof value[1] === 'string';

const toRecord = (value: unknown): PendingBorrowRecord | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const { executionId, rows, borrowSymbol } = value as Record<string, unknown>;

  if (
    typeof executionId !== 'string' ||
    executionId === '' ||
    !Array.isArray(rows) ||
    !rows.every(isRow)
  ) {
    return undefined;
  }

  return {
    executionId,
    rows,
    ...(typeof borrowSymbol === 'string' ? { borrowSymbol } : {}),
  };
};

/** Every well-formed record; a malformed entry is dropped. */
const readAll = (): Records => {
  let parsed: unknown;

  try {
    const raw = window.localStorage.getItem(PENDING_BORROW_STORAGE_KEY);

    if (raw === null) {
      return {};
    }

    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const records: Records = {};

  Object.entries(parsed).forEach(([key, value]) => {
    const record = toRecord(value);

    if (record) {
      records[key] = record;
    }
  });

  return records;
};

const writeAll = (records: Records) => {
  try {
    if (Object.keys(records).length === 0) {
      window.localStorage.removeItem(PENDING_BORROW_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        PENDING_BORROW_STORAGE_KEY,
        JSON.stringify(records),
      );
    }
  } catch {
    // Not kept: a reload shows the generic rows instead.
  }
};

/** The wallet's record, if a well-formed one is kept. */
export const readPendingBorrow = (
  address: string,
): PendingBorrowRecord | undefined => readAll()[walletKey(address)];

/** Keeps `record` as the wallet's borrow in flight, replacing any other. */
export const savePendingBorrow = (
  address: string,
  record: PendingBorrowRecord,
) => {
  writeAll({ ...readAll(), [walletKey(address)]: record });
};

/**
 * Forgets the wallet's record; with `executionId`, only when it is that
 * execution's (a newer borrow's record stays).
 */
export const clearPendingBorrow = (address: string, executionId?: string) => {
  const records = readAll();
  const key = walletKey(address);
  const record = records[key];

  if (
    !record ||
    (executionId !== undefined && record.executionId !== executionId)
  ) {
    return;
  }

  delete records[key];
  writeAll(records);
};
