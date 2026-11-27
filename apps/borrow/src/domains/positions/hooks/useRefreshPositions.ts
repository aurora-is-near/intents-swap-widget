import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import { POSITIONS_QUERY_KEY } from './usePositions';

/**
 * vaults.fyi indexes the chain with a lag, so a loan just opened may only
 * show on a later read: positions are read again now and after these delays.
 */
const FOLLOW_UP_REFRESH_MS = [10_000, 30_000] as const;

/**
 * The pending follow-ups per query client. They belong to the app's query
 * client, not to the page that saw the borrow finish: "View position" leaves
 * that page at once, and the follow-ups must still run on My positions.
 */
const followUps = new WeakMap<QueryClient, ReturnType<typeof setTimeout>[]>();

/** Refreshes every positions read now and after each follow-up delay. */
const refreshPositions = (queryClient: QueryClient) => {
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: POSITIONS_QUERY_KEY });
  };

  followUps.get(queryClient)?.forEach(clearTimeout);
  refresh();
  followUps.set(
    queryClient,
    FOLLOW_UP_REFRESH_MS.map((delay) => setTimeout(refresh, delay)),
  );
};

/**
 * Refreshes positions once per borrow that is done, now and twice more as
 * vaults.fyi catches up, from the borrow flow's state: a borrow done here or
 * restored after a reload. The follow-ups outlive the page; a later done
 * borrow replaces them.
 */
export const useRefreshPositionsOnDone = (
  state: { kind: 'done'; executionId: string } | { kind: string },
): void => {
  const queryClient = useQueryClient();
  const doneExecutionId =
    state.kind === 'done' && 'executionId' in state
      ? state.executionId
      : undefined;

  useEffect(() => {
    if (doneExecutionId) {
      refreshPositions(queryClient);
    }
  }, [doneExecutionId, queryClient]);
};
