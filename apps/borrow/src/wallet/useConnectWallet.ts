import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useCallback } from 'react';

/**
 * Opens the AppKit connect modal, for click handlers. Closing the modal
 * without connecting rejects; that is not an error here, and the modal
 * reports its own failures, so the rejection is dropped.
 */
export function useConnectWallet() {
  const { connect } = useIntentsConnectWallet();

  return useCallback(() => {
    Promise.resolve(connect()).catch(() => {});
  }, [connect]);
}
