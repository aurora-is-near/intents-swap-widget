import { useEffect, useState } from 'react';

import { useConfig } from '@/config';
import { notReachable } from '@/utils/notReachable';
import { localStorageTyped } from '@/utils/localstorage';
import { useCompatibilityCheck } from '@/hooks/useCompatibilityCheck';
import type { IntentsTransferArgs } from '@/types';
import { WalletCompatibilityModal } from './WalletCompatibilityModal';

type Msg = { type: 'on_sign_out' };

type Props = {
  providers: IntentsTransferArgs['providers'];
  onMsg: (msg: Msg) => void;
};

export function WalletCompatibilityCheck({ onMsg, providers }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<'initial' | 'error'>('initial');
  const { walletAddress } = useConfig();
  const { handleSign, isSigning } = useCompatibilityCheck({ providers });

  useEffect(() => {
    if (!walletAddress) {
      setIsOpen(false);

      return;
    }

    const verifiedWallets = localStorageTyped.getItem('verifiedWallets');

    if (!verifiedWallets.includes(walletAddress)) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [walletAddress]);

  // Disable scroll when modal is open
  // make sure to disable only vertical scroll
  useEffect(() => {
    if (isOpen) {
      window.document.body.style.overflowY = 'hidden';
    } else {
      window.document.body.style.overflowY = 'auto';
    }

    return () => {
      window.document.body.style.overflowY = 'auto';
    };
  }, [isOpen]);

  async function handleCompatibilityCheck() {
    if (!walletAddress) {
      setIsOpen(false);

      return;
    }

    const isValid = await handleSign();

    if (!isValid) {
      setState('error');

      return;
    }

    // no need to verify if a wallet is already verified, the modal won't show up
    const verifiedWallets = localStorageTyped.getItem('verifiedWallets');

    verifiedWallets.push(walletAddress);
    localStorageTyped.setItem('verifiedWallets', verifiedWallets);

    setIsOpen(false);
  }

  function handleTryAgain() {
    setState('initial');
  }

  function handleSignOut() {
    setIsOpen(false);
    onMsg({ type: 'on_sign_out' });
  }

  if (!isOpen) {
    return null;
  }

  if (!walletAddress) {
    return null;
  }

  return (
    <WalletCompatibilityModal
      state={state}
      isSigning={isSigning}
      onMsg={async (msg) => {
        switch (msg.type) {
          case 'on_close':
            setIsOpen(false);
            break;
          case 'on_check_compatibility':
            await handleCompatibilityCheck();
            break;
          case 'on_try_again':
            handleTryAgain();
            break;
          case 'on_sign_out':
            handleSignOut();
            break;
          default:
            notReachable(msg);
        }
      }}
    />
  );
}
