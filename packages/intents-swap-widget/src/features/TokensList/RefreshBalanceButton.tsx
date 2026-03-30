import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshFillW700 as RefreshIcon } from '@material-symbols-svg/react-rounded/icons/refresh';

import { useTypedTranslation } from '@/localisation';
import { useBalancesUpdate } from '@/context/BalancesUpdateContext';

const REFRESH_COOLDOWN_MS = 15_000;

export const RefreshBalanceButton = () => {
  const { t } = useTypedTranslation();

  const { refresh } = useBalancesUpdate();
  const [isRefreshCooldown, setIsRefreshCooldown] = useState(false);
  const [refreshClickCount, setRefreshClickCount] = useState(0);
  const refreshCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handleRefreshClick = useCallback(() => {
    setRefreshClickCount((current) => current + 1);

    if (isRefreshCooldown) {
      return;
    }

    refresh();
    setIsRefreshCooldown(true);

    if (refreshCooldownTimerRef.current) {
      clearTimeout(refreshCooldownTimerRef.current);
    }

    refreshCooldownTimerRef.current = setTimeout(() => {
      setIsRefreshCooldown(false);
      refreshCooldownTimerRef.current = null;
    }, REFRESH_COOLDOWN_MS);
  }, [isRefreshCooldown, refresh]);

  useEffect(() => {
    return () => {
      if (refreshCooldownTimerRef.current) {
        clearTimeout(refreshCooldownTimerRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      className="mt-[14px] text-sw-label-sm text-sw-gray-300 hover:text-sw-gray-100 transition-colors cursor-pointer outline-none border-none bg-transparent flex items-center gap-sw-xs"
      onClick={handleRefreshClick}>
      <RefreshIcon
        key={refreshClickCount}
        className="w-[13px] h-[13px]"
        style={
          refreshClickCount > 0
            ? {
                animation: 'spin 0.45s linear 3',
              }
            : undefined
        }
      />
      {t('tokens.list.refreshBalances.label', 'Refresh')}
    </button>
  );
};
