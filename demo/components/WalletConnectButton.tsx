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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: isConnected
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : '#3396FF',
        color: 'white',
        border: 'none',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(51, 150, 255, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}>
      <img src={walletConnectIcon} alt="WalletConnect" width={20} height={20} />
      {displayText}
    </button>
  );
}
