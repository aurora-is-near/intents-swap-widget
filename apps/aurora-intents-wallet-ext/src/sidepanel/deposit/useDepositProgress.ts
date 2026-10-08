import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import { getPersistentDepositStatus } from './feeService';
import type { DepositRecord } from './feeService';

const POLL_MS = 5000;

export type DepositProgress =
  | { status: 'waiting' }
  /** Arrived at the address; being converted and credited. */
  | { status: 'pending'; received: DepositRecord }
  | { status: 'success'; received?: DepositRecord; credited: DepositRecord }
  | { status: 'failed'; received?: DepositRecord; failed: DepositRecord };

type Snapshot = Record<'received' | 'success' | 'failed', DepositRecord[]>;

const fetchSnapshot = async (address: string): Promise<Snapshot> => {
  const [received, success, failed] = await Promise.all([
    getPersistentDepositStatus(address, 'received'),
    getPersistentDepositStatus(address, 'success'),
    getPersistentDepositStatus(address, 'failed'),
  ]);

  return { received, success, failed };
};

/**
 * A record's identity. Failed payouts carry no tx hash, so the hash alone
 * would make every failure look like the same record.
 */
const recordKey = (record: DepositRecord) =>
  `${record.tx_hash}|${record.created_at}|${record.amount}`;

const keys = (records: DepositRecord[]) => new Set(records.map(recordKey));

const time = (record: DepositRecord) => Date.parse(record.created_at) || 0;

/** Payouts are timed by 1Click, deposits by POA: allow for clock skew. */
const CLOCK_SKEW_MS = 60_000;

/**
 * What happened at a persistent deposit address since the screen opened.
 * Earlier deposits form the baseline, so only a transfer made now shows up.
 */
export const useDepositProgress = (address: string | undefined) => {
  const baseline = useRef<Record<keyof Snapshot, Set<string>> | null>(null);
  const openedAt = useRef(Date.now());

  const query = useQuery({
    queryKey: ['depositProgress', address],
    queryFn: () => fetchSnapshot(address!),
    enabled: !!address,
    refetchInterval: POLL_MS,
    // Keep watching while the panel is hidden, e.g. the browser is minimised
    // while the user sends from their phone.
    refetchIntervalInBackground: true,
    // Always start from fresh data: the baseline must not come from a cache.
    gcTime: 0,
  });

  if (!query.data) {
    return { progress: { status: 'waiting' } as DepositProgress, query };
  }

  baseline.current ??= {
    received: keys(query.data.received),
    success: keys(query.data.success),
    failed: keys(query.data.failed),
  };

  const isNew = (type: keyof Snapshot) => (record: DepositRecord) =>
    !baseline.current?.[type].has(recordKey(record));

  // Newest first, per the fee service.
  const received = query.data.received.find(isNew('received'));

  // Payouts are reported for the whole underlying account (every address and
  // chain), so only those since this deposit — or since the screen opened, if
  // the deposit isn't indexed yet — belong to it.
  const since = (received ? time(received) : openedAt.current) - CLOCK_SKEW_MS;
  const outcomes = [
    ...query.data.success
      .filter(isNew('success'))
      .map((record) => ({ status: 'success' as const, record })),
    ...query.data.failed
      .filter(isNew('failed'))
      .map((record) => ({ status: 'failed' as const, record })),
  ]
    .filter(({ record }) => time(record) >= since)
    // The newest outcome wins: a failed attempt may be retried and succeed.
    .sort((a, b) => time(b.record) - time(a.record));

  const [latest] = outcomes;
  let progress: DepositProgress = { status: 'waiting' };

  if (latest?.status === 'success') {
    progress = { status: 'success', received, credited: latest.record };
  } else if (latest?.status === 'failed') {
    progress = { status: 'failed', received, failed: latest.record };
  } else if (received) {
    progress = { status: 'pending', received };
  }

  return { progress, query };
};
