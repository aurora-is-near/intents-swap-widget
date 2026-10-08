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

const hashes = (records: DepositRecord[]) =>
  new Set(records.map((record) => record.tx_hash));

/**
 * What happened at a persistent deposit address since the screen opened.
 * Earlier deposits form the baseline, so only a transfer made now shows up.
 */
export const useDepositProgress = (address: string | undefined) => {
  const baseline = useRef<Record<keyof Snapshot, Set<string>> | null>(null);

  const query = useQuery({
    queryKey: ['depositProgress', address],
    queryFn: () => fetchSnapshot(address!),
    enabled: !!address,
    refetchInterval: POLL_MS,
    // Always start from fresh data: the baseline must not come from a cache.
    gcTime: 0,
  });

  if (!query.data) {
    return { progress: { status: 'waiting' } as DepositProgress, query };
  }

  baseline.current ??= {
    received: hashes(query.data.received),
    success: hashes(query.data.success),
    failed: hashes(query.data.failed),
  };

  const isNew = (type: keyof Snapshot) => (record: DepositRecord) =>
    !baseline.current?.[type].has(record.tx_hash);

  // Newest first, per the fee service.
  const received = query.data.received.find(isNew('received'));
  const credited = query.data.success.find(isNew('success'));
  const failed = query.data.failed.find(isNew('failed'));

  let progress: DepositProgress = { status: 'waiting' };

  if (failed) {
    progress = { status: 'failed', received, failed };
  } else if (credited) {
    progress = { status: 'success', received, credited };
  } else if (received) {
    progress = { status: 'pending', received };
  }

  return { progress, query };
};
