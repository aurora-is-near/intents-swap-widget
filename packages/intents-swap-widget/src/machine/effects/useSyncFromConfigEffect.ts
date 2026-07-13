import { useEffect } from 'react';

import { useConfig } from '@/config';
import { fireEvent } from '@/machine';

import type { ListenerProps } from './types';

export type Props = ListenerProps;

export const useSyncFromConfigEffect = ({ isEnabled }: Props) => {
  const { confidentialMode } = useConfig();

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    if (confidentialMode === 'confidential') {
      fireEvent('confidentialModeSet', confidentialMode);
    } else {
      fireEvent('confidentialModeSet', 'public');
    }
  }, [isEnabled, confidentialMode]);
};
