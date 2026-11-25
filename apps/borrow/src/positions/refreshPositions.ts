import { type QueryClient, QueryClientContext } from '@tanstack/react-query';
import { useCallback, useContext } from 'react';

/** Every positions query key starts with this. */
export const POSITIONS_QUERY_KEY = ['positions'] as const;

/**
 * After a borrow, the positions are read again at once and then at these
 * delays: the provider may index the new loan some seconds after the chain.
 */
export const POSITIONS_FOLLOW_UP_REFETCH_MS = [10_000, 30_000] as const;

const followUps = new WeakMap<QueryClient, ReturnType<typeof setTimeout>[]>();

const invalidatePositions = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: POSITIONS_QUERY_KEY });
};

/**
 * Invalidates every positions query now and again at ~10 s and ~30 s. A
 * second call restarts the follow-ups instead of adding more. The timers are
 * not tied to a component: "View position" leaves the page that started the
 * borrow, and the follow-ups must still run.
 */
export const refreshPositionsAfterBorrow = (queryClient: QueryClient) => {
  followUps.get(queryClient)?.forEach(clearTimeout);
  invalidatePositions(queryClient);
  followUps.set(
    queryClient,
    POSITIONS_FOLLOW_UP_REFETCH_MS.map((delay) =>
      setTimeout(() => invalidatePositions(queryClient), delay),
    ),
  );
};

/**
 * `refreshPositionsAfterBorrow` on the app's query client. Outside a
 * `QueryClientProvider` nothing reads positions, so there is nothing to
 * refresh and it does nothing.
 */
export const usePositionsRefresh = () => {
  const queryClient = useContext(QueryClientContext);

  return useCallback(() => {
    if (queryClient) {
      refreshPositionsAfterBorrow(queryClient);
    }
  }, [queryClient]);
};
