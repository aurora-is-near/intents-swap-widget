import { useEffect, useState } from 'react';

import { useMergedBalance } from '@/hooks/useMergedBalance';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';
import type { Token } from '@/types/token';

export const useTokenInputBalance = (token: Token | undefined) => {
  const { mergedBalance } = useMergedBalance();

  const [sourceTokenBalance, setSourceTokenBalance] = useState(
    token ? mergedBalance[getTokenBalanceKey(token)] : undefined,
  );

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    if (token) {
      const existingBalance = mergedBalance[getTokenBalanceKey(token)];

      if (!existingBalance) {
        // if no balance can be fetched, we set 0 after 2s to avoid infinite loading state
        timeoutId = setTimeout(() => {
          setSourceTokenBalance(
            token ? (mergedBalance[getTokenBalanceKey(token)] ?? 0) : 0,
          );
        }, 2000);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [token, mergedBalance]);

  return sourceTokenBalance;
};
