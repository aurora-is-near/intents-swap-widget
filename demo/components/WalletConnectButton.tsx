import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import walletConnectIcon from '../assets/wallet-connect-icon.svg?url';

export function WalletConnectButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  const displayText =
    isConnected && address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : 'Connect Multi-Chain';

  return (
    <button
      type="button"
      onClick={() => open()}
      className={`wallet-connect-button ${isConnected ? 'connected' : ''}`}>
      <img src={walletConnectIcon} alt="WalletConnect" width={20} height={20} />
      {displayText}
    </button>
  );
}
