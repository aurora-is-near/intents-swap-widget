import { useEffect } from 'react';

import type { ListenerProps } from './types';
import { useConfig } from '@/config';

import { fireEvent, moveTo } from '@/machine';
import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';

export const useWalletConnEffect = ({ isEnabled }: ListenerProps) => {
  const { walletAddress } = useConfig();
  const { ctx, state } = useUnsafeSnapshot();

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    fireEvent('walletAddressSet', walletAddress ?? undefined);

    const isValidState = guardStates(ctx, ['initial_dry', 'initial_wallet']);

    if (isValidState) {
      if (state === 'initial_wallet' && !walletAddress) {
        moveTo('initial_dry');
      } else if (state === 'initial_dry' && walletAddress) {
        moveTo('initial_wallet');
      }
    }
  }, [isEnabled, walletAddress, ctx, state]);
};
