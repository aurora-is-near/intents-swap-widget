import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { cn } from '../../src/utils';

type WalletConnectButtonProps = {
  connectText?: string;
  className?: string;
};

export const WalletConnectButton = ({
  connectText = 'Connect Wallet',
  className,
}: WalletConnectButtonProps) => {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  const displayText =
    isConnected && address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : connectText;

  return (
    <button
      type="button"
      onClick={() => open()}
      className={cn(
        'wallet-connect-button',
        isConnected && 'connected',
        className,
      )}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <circle cx="5.5" cy="4" r="3.5" fill="white" />
        <circle cx="14.5" cy="4" r="3.5" fill="white" />
        <circle cx="5.5" cy="16" r="3.5" fill="white" />
        <circle cx="14.5" cy="16" r="3.5" fill="white" />
      </svg>

      {displayText}
    </button>
  );
};
