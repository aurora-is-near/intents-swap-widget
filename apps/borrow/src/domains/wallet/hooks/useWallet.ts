import { useContext } from 'react';

import { WalletSessionContext } from '../providers/walletSessionContext';
import type { WalletSession } from '../types';

/** The connected wallet. Throws outside `WalletSessionProvider`. */
export const useWallet = (): WalletSession => {
  const session = useContext(WalletSessionContext);

  if (!session) {
    throw new Error('useWallet must be used inside WalletSessionProvider');
  }

  return session;
};
