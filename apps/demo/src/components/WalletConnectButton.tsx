import { cn } from '@aurora-is-near/intents-swap-widget/utils';
import { useAppKitWallet } from '../hooks/useAppKitWallet';

type WalletConnectButtonProps = {
  connectText?: string;
  className?: string;
};

export const WalletConnectButton = ({
  connectText = 'Connect Wallet',
  className,
}: WalletConnectButtonProps) => {
  const { connect, address, isConnected } = useAppKitWallet();

  const displayText =
    isConnected && address
      ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`
      : connectText;

  return (
    <button
      type="button"
      onClick={() => connect()}
      className={cn(
        'wallet-connect-button',
        isConnected && 'connected',
        className,
      )}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <circle cx="4.5" cy="4" r="2.5" fill="white" />
        <circle cx="11.5" cy="4" r="2.5" fill="white" />
        <circle cx="4.5" cy="12" r="2.5" fill="white" />
        <circle cx="11.5" cy="12" r="2.5" fill="white" />
      </svg>

      {displayText}
    </button>
  );
};
