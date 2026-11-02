import { useEffect } from 'react';

import { useTokens } from '@/hooks/useTokens';
import { getIntentsTargetToken } from '@/utils/tokens/getIntentsTargetToken';

import { fireEvent } from '@/machine';
import { useUnsafeSnapshot } from '@/machine/snap';
import type { ListenerProps } from './types';

export const useSetTokenIntentsTargetEffect = ({
  isEnabled,
}: ListenerProps) => {
  const { ctx } = useUnsafeSnapshot();

  const { tokens } = useTokens();

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    // If source token is not set - no target token exists
    fireEvent('tokenSelect', {
      variant: 'target',
      token: ctx.sourceToken
        ? getIntentsTargetToken(ctx.sourceToken, tokens)
        : undefined,
    });
  }, [tokens, ctx.sourceToken]);
};
