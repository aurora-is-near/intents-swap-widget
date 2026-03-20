import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useMergedBalance } from '@/hooks/useMergedBalance';
import type { TokenBalance } from '@/types/token';

export type PendingEntry = {
  priorBalance: TokenBalance;
};

export type BalancesUpdateContextType = {
  lastUpdatedAt: Date | null;
  pendingBalances: Record<string, PendingEntry>;
  addPendingTokens: (
    entries: Array<{ balanceKey: string; priorBalance: TokenBalance }>,
  ) => void;
  notifyRefreshed: () => void;
  /** Trigger an immediate refresh of intents and RPC balances. */
  refresh: () => void;
};

const BalancesUpdateContext = createContext<BalancesUpdateContextType | null>(
  null,
);

const BalancesUpdateProviderInner = ({ children }: { children: ReactNode }) => {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [pendingBalances, setPendingBalances] = useState<
    Record<string, PendingEntry>
  >({});

  const { mergedBalance } = useMergedBalance();
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    void (async () => {
      await queryClient.invalidateQueries({ queryKey: ['intentsBalances'] });
      await queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });
    })();
  }, [queryClient]);

  const addPendingTokens = useCallback(
    (entries: Array<{ balanceKey: string; priorBalance: TokenBalance }>) => {
      setPendingBalances((prev) => {
        const next = { ...prev };

        // eslint-disable-next-line no-restricted-syntax
        for (const { balanceKey, priorBalance } of entries) {
          next[balanceKey] = { priorBalance };
        }

        return next;
      });
    },
    [],
  );

  const notifyRefreshed = useCallback(() => {
    setLastUpdatedAt(new Date());
  }, []);

  // Remove entries whose balance has changed from the pre-swap snapshot
  useEffect(() => {
    if (Object.keys(pendingBalances).length === 0) {
      return;
    }

    const resolvedKeys = Object.keys(pendingBalances).filter(
      (key) => mergedBalance[key] !== pendingBalances[key]?.priorBalance,
    );

    if (resolvedKeys.length === 0) {
      return;
    }

    setPendingBalances((prev) => {
      const next = { ...prev };

      // eslint-disable-next-line no-restricted-syntax
      for (const key of resolvedKeys) {
        delete next[key];
      }

      return next;
    });
  }, [mergedBalance, pendingBalances]);

  const value = useMemo(
    () => ({
      lastUpdatedAt,
      pendingBalances,
      addPendingTokens,
      notifyRefreshed,
      refresh,
    }),
    [
      lastUpdatedAt,
      pendingBalances,
      addPendingTokens,
      notifyRefreshed,
      refresh,
    ],
  );

  return (
    <BalancesUpdateContext.Provider value={value}>
      {children}
    </BalancesUpdateContext.Provider>
  );
};

/**
 * Provides balance update tracking (pending tokens, last refresh timestamp).
 * Idempotent — if a parent already provides this context the component is a
 * transparent pass-through, so nesting multiple providers is safe.
 */
export const BalancesUpdateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const existing = useContext(BalancesUpdateContext);

  if (existing !== null) {
    return <>{children}</>;
  }

  return <BalancesUpdateProviderInner>{children}</BalancesUpdateProviderInner>;
};

export const useBalancesUpdate = (): BalancesUpdateContextType => {
  const ctx = useContext(BalancesUpdateContext);

  return (
    ctx ?? {
      lastUpdatedAt: null,
      pendingBalances: {},
      addPendingTokens: () => {},
      notifyRefreshed: () => {},
      refresh: () => {},
    }
  );
};
