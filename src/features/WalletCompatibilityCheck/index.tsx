import { useEffect, useState } from 'react';
import { useConfig } from '@/config';
import { notReachable } from '@/utils/notReachable';
import { IntentsTransferArgs } from '@/types';
import { useCompatibilityCheck } from '@/hooks/useCompatibilityCheck';
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
      return;
    }

    const verifiedWallets = JSON.parse(
      window.localStorage.getItem('verifiedWallets') ?? '[]',
    ) as string[];

    if (!verifiedWallets.includes(walletAddress)) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (isOpen) {
      window.document.body.style.overflow = 'hidden';
    } else {
      window.document.body.style.overflow = 'auto';
    }

    return () => {
      window.document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  async function handleCompatibilityCheck() {
    const isValid = await handleSign();

    if (isValid) {
      const verifiedWallets = JSON.parse(
        window.localStorage.getItem('verifiedWallets') ?? '[]',
      ) as string[];

      if (!verifiedWallets.includes(walletAddress!)) {
        verifiedWallets.push(walletAddress!);
        window.localStorage.setItem(
          'verifiedWallets',
          JSON.stringify(verifiedWallets),
        );
      }

      setIsOpen(false);
    } else {
      setState('error');
      return;
    }
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
      onMsg={(msg) => {
        switch (msg.type) {
          case 'on_close':
            setIsOpen(false);
            break;
          case 'on_check_compatibility':
            handleCompatibilityCheck();
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
