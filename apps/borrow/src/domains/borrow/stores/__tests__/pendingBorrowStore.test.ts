import { describe, expect, it, vi } from 'vitest';

import {
  clearPendingBorrow,
  PENDING_BORROW_STORAGE_KEY,
  readPendingBorrow,
  savePendingBorrow,
} from '../pendingBorrowStore';
import type { PendingBorrowRecord } from '../pendingBorrowStore';

const ALICE = '0x7A3f5b2e8d1c4a6f9e0b3d7c2a8f1e4b6d0c9c21';
const BOB = '0x1111111111111111111111111111111111111111';
const SOL = 'So1anaWa11etAddre55Case5ensitive111111111';

const record = (executionId: string): PendingBorrowRecord => ({
  executionId,
  rows: [
    ['Supply', '0.99 WETH · Base'],
    ['Borrow', '1,485 USDC · Base'],
  ],
  borrowSymbol: 'USDC',
});

const stored = () =>
  JSON.parse(window.localStorage.getItem(PENDING_BORROW_STORAGE_KEY) ?? 'null');

describe('pendingBorrowStore', () => {
  it('keeps one record per wallet under one key, and reads it back', () => {
    savePendingBorrow(ALICE, record('exec-a'));
    savePendingBorrow(BOB, record('exec-b'));

    expect(readPendingBorrow(ALICE)).toEqual(record('exec-a'));
    expect(readPendingBorrow(BOB)).toEqual(record('exec-b'));
    expect(Object.keys(window.localStorage)).toEqual([
      PENDING_BORROW_STORAGE_KEY,
    ]);
    expect(Object.keys(stored())).toHaveLength(2);
  });

  it('matches an EVM wallet in any case, but not a case-sensitive one', () => {
    savePendingBorrow(ALICE, record('exec-a'));
    savePendingBorrow(SOL, record('exec-s'));

    expect(readPendingBorrow(ALICE.toLowerCase())).toEqual(record('exec-a'));
    expect(readPendingBorrow(SOL)).toEqual(record('exec-s'));
    expect(readPendingBorrow(SOL.toLowerCase())).toBeUndefined();
  });

  it('replaces the wallet’s earlier record', () => {
    savePendingBorrow(ALICE, record('exec-1'));
    savePendingBorrow(ALICE, record('exec-2'));

    expect(readPendingBorrow(ALICE)?.executionId).toBe('exec-2');
  });

  it('clears the wallet’s record, and only that one', () => {
    savePendingBorrow(ALICE, record('exec-a'));
    savePendingBorrow(BOB, record('exec-b'));

    clearPendingBorrow(ALICE);

    expect(readPendingBorrow(ALICE)).toBeUndefined();
    expect(readPendingBorrow(BOB)).toEqual(record('exec-b'));
  });

  it('clears by execution only when the record is that execution’s', () => {
    savePendingBorrow(ALICE, record('exec-2'));

    clearPendingBorrow(ALICE, 'exec-1');

    expect(readPendingBorrow(ALICE)?.executionId).toBe('exec-2');

    clearPendingBorrow(ALICE, 'exec-2');

    expect(readPendingBorrow(ALICE)).toBeUndefined();
    // The last record gone, the key is removed.
    expect(window.localStorage.getItem(PENDING_BORROW_STORAGE_KEY)).toBeNull();
  });

  it.each([
    ['not JSON', '{oops'],
    ['an array', '[1, 2]'],
    ['a string', '"exec-a"'],
    ['null', 'null'],
  ])('ignores stored data that is %s', (_, raw) => {
    window.localStorage.setItem(PENDING_BORROW_STORAGE_KEY, raw);

    expect(readPendingBorrow(ALICE)).toBeUndefined();

    // And a save still works over it.
    savePendingBorrow(ALICE, record('exec-a'));

    expect(readPendingBorrow(ALICE)).toEqual(record('exec-a'));
  });

  it('ignores a malformed record and keeps the well-formed ones', () => {
    window.localStorage.setItem(
      PENDING_BORROW_STORAGE_KEY,
      JSON.stringify({
        [ALICE.toLowerCase()]: { executionId: 'exec-a', rows: [['Supply']] },
        [BOB]: { executionId: 'exec-b', rows: [['Borrow', '1 USDC']] },
        other: { executionId: 7, rows: [] },
      }),
    );

    expect(readPendingBorrow(ALICE)).toBeUndefined();
    expect(readPendingBorrow(BOB)).toEqual({
      executionId: 'exec-b',
      rows: [['Borrow', '1 USDC']],
    });
    expect(readPendingBorrow('other')).toBeUndefined();
  });

  it('carries on without storage that throws', () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });

    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota');
      });

    expect(() => savePendingBorrow(ALICE, record('exec-a'))).not.toThrow();
    expect(readPendingBorrow(ALICE)).toBeUndefined();
    expect(() => clearPendingBorrow(ALICE)).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('drops fields it no longer keeps but keeps the rest of the record', () => {
    window.localStorage.setItem(
      PENDING_BORROW_STORAGE_KEY,
      JSON.stringify({
        [ALICE.toLowerCase()]: {
          ...record('exec-a'),
          origin: { chain: 'arb', decimals: 6 },
          depositSent: true,
        },
      }),
    );

    expect(readPendingBorrow(ALICE)).toEqual(record('exec-a'));
  });
});
