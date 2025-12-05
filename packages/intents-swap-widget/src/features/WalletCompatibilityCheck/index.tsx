import { useState } from 'react';

import { WalletCompatibilityModal } from './WalletCompatibilityModal';
import { useUnsafeSnapshot } from '../../machine';
import { notReachable } from '@/utils/notReachable';
import { localStorageTyped } from '@/utils/localstorage';
import { useCompatibilityCheck } from '@/hooks/useCompatibilityCheck';
import type { IntentsTransferArgs } from '@/types';

type Msg = { type: 'on_sign_out' | 'on_close' };

type Props = {
  providers: IntentsTransferArgs['providers'];
  onMsg: (msg: Msg) => void;
};

export function WalletCompatibilityCheck({ onMsg, providers }: Props) {
  const [hasError, setHasError] = useState(false);
  const [isSigned, setIsSigned] = useState(false);

  const {
    ctx: { walletAddress },
  } = useUnsafeSnapshot();

  const { handleSign, isSigning } = useCompatibilityCheck({
    providers,
    walletAddress,
  });

  async function handleCompatibilityCheck() {
    if (!walletAddress) {
      return;
    }

    const isValid = await handleSign();

    if (!isValid) {
      setHasError(true);

      return;
    }

    // no need to verify if a wallet is already verified, the modal won't show up
    const verifiedWallets = localStorageTyped.getItem('verifiedWallets');

    verifiedWallets.push(walletAddress);
    localStorageTyped.setItem('verifiedWallets', verifiedWallets);
    setIsSigned(true);
  }

  return hasError ? (
    <WalletCompatibilityModal.Error
      onMsg={async (msg) => {
        switch (msg.type) {
          case 'on_close':
            onMsg({ type: 'on_close' });
            break;
          case 'on_try_again':
            setHasError(false);
            break;
          case 'on_sign_out':
            onMsg({ type: 'on_sign_out' });
            break;
          default:
            notReachable(msg.type);
        }
      }}
    />
  ) : (
    <WalletCompatibilityModal
      isSigned={isSigned}
      isSigning={isSigning}
      onMsg={async (msg) => {
        switch (msg.type) {
          case 'on_close':
            onMsg({ type: 'on_close' });
            break;
          case 'on_check_compatibility':
            await handleCompatibilityCheck();
            break;
          case 'on_sign_out':
            onMsg({ type: 'on_sign_out' });
            break;
          default:
            notReachable(msg.type);
        }
      }}
    />
  );
}
