import '@near-wallet-selector/modal-ui/styles.css';
import { useWalletSelector } from '@near-wallet-selector/react-hook';
import { cn } from '../../src/utils';
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

export const NearWalletConnectButton = ({
  connectText = 'Connect Wallet',
  className,
}: WalletConnectButtonProps) => {
  const { signIn: connect, signedAccountId: address } = useWalletSelector();
  const isConnected = address !== null;

  const displayText =
    isConnected && address ? `Connected: ${address}` : connectText;

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
