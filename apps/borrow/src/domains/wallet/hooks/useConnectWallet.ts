import { useCallback } from 'react';

import { useWallet } from './useWallet';

/**
 * Opens the wallet connect modal, for click handlers. Closing the modal
 * without connecting rejects; that is not an error here, and the modal
 * reports its own failures, so the rejection is dropped.
 */
export function useConnectWallet() {
  const { connect } = useWallet();

  return useCallback(() => {
    Promise.resolve(connect()).catch(() => {});
  }, [connect]);
}
