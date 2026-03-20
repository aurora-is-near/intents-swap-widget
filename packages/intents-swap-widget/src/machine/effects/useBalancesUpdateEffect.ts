import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useConfig } from '../../config';
import type { ListenerProps } from './types';

import { useBalancesUpdate } from '@/context/BalancesUpdateContext';
import { useAlchemyBalanceIntegration } from '@/ext/alchemy';
import { logger } from '@/logger';

const BALANCE_REFRESH_INTERVAL_PENDING_MS = 15_000;
const BALANCE_REFRESH_INTERVAL_IDLE_MS = 60_000;
const ALCHEMY_REFRESH_DELAY_MS = 12_000;

export type Props = ListenerProps & {
  alchemyApiKey: string | undefined;
};

export const useBalancesUpdateEffect = ({
  isEnabled,
  alchemyApiKey,
}: Props) => {
  const { connectedWallets } = useConfig();
  const queryClient = useQueryClient();

  const { refetch: refetchAlchemyBalances } = useAlchemyBalanceIntegration({
    isEnabled,
    connectedWallets,
    alchemyApiKey: alchemyApiKey ?? '',
  });

  const { notifyRefreshed, pendingBalances } = useBalancesUpdate();

  const hasPendingTokens = Object.keys(pendingBalances).length > 0;

  const isRefreshingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshBalances = useCallback(
    async (signal: AbortSignal) => {
      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;

      try {
        await queryClient.invalidateQueries({ queryKey: ['intentsBalances'] });
        await queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });

        if (alchemyApiKey && !signal.aborted) {
          await new Promise<void>((resolve, reject) => {
            const id = setTimeout(resolve, ALCHEMY_REFRESH_DELAY_MS);

            signal.addEventListener('abort', () => {
              clearTimeout(id);
              reject(new DOMException('Aborted', 'AbortError'));
            });
          });

          await refetchAlchemyBalances();
        }

        if (!signal.aborted) {
          notifyRefreshed();
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        logger.error('[useBalancesUpdateEffect] Balance refresh failed', error);
      } finally {
        isRefreshingRef.current = false;
      }
    },
    [alchemyApiKey, notifyRefreshed, queryClient, refetchAlchemyBalances],
  );

  // Interval shortens to 15s while swapped tokens are awaiting balance
  // confirmation, and returns to 60s once all balances have settled.
  const intervalMs = hasPendingTokens
    ? BALANCE_REFRESH_INTERVAL_PENDING_MS
    : BALANCE_REFRESH_INTERVAL_IDLE_MS;

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const controller = new AbortController();

    abortControllerRef.current = controller;

    const intervalId = setInterval(() => {
      void refreshBalances(controller.signal);
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [intervalMs, isEnabled, refreshBalances]);
};
