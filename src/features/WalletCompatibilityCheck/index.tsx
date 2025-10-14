import { useEffect, useState } from 'react';
import { useConfig } from '@/config';
import { IntentsTransferArgs } from '../../types';
import { useCompatibilityCheck } from '../../hooks/useCompatibilityCheck';
import { WalletCompatibilityModal } from './WalletCompatibilityModal';

type Props = {
  providers: IntentsTransferArgs['providers'];
  onSignOut: () => void;
};

export function WalletCompatibilityCheck({ onSignOut, providers }: Props) {
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
    }
  }

  function handleTryAgain() {
    setState('initial');
  }

  function handleSignOut() {
    setIsOpen(false);
    onSignOut();
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
      onClose={() => setIsOpen(false)}
      onCheckCompatibility={handleCompatibilityCheck}
      onTryAgain={handleTryAgain}
      onSignOut={handleSignOut}
    />
  );
}
