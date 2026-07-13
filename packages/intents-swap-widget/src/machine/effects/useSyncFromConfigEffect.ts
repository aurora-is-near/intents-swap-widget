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

    // In 'user-choice' mode the user controls confidentiality via the header
    // toggle, so config must not force/override the machine context (otherwise
    // remounting this effect — e.g. after opening/closing history — resets it).
    if (confidentialMode === 'user-choice') {
      return;
    }

    fireEvent(
      'confidentialModeSet',
      confidentialMode === 'confidential' ? 'confidential' : 'public',
    );
  }, [isEnabled, confidentialMode]);
};
