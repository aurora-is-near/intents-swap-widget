import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

export function WalletConnectButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  return (
    <button
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
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5.5 7.5C7.433 7.5 9 5.933 9 4C9 2.067 7.433 0.5 5.5 0.5C3.567 0.5 2 2.067 2 4C2 5.933 3.567 7.5 5.5 7.5Z"
          fill="white"
        />
        <path
          d="M14.5 7.5C16.433 7.5 18 5.933 18 4C18 2.067 16.433 0.5 14.5 0.5C12.567 0.5 11 2.067 11 4C11 5.933 12.567 7.5 14.5 7.5Z"
          fill="white"
        />
        <path
          d="M5.5 19.5C7.433 19.5 9 17.933 9 16C9 14.067 7.433 12.5 5.5 12.5C3.567 12.5 2 14.067 2 16C2 17.933 3.567 19.5 5.5 19.5Z"
          fill="white"
        />
        <path
          d="M14.5 19.5C16.433 19.5 18 17.933 18 16C18 14.067 16.433 12.5 14.5 12.5C12.567 12.5 11 14.067 11 16C11 17.933 12.567 19.5 14.5 19.5Z"
          fill="white"
        />
      </svg>
      {isConnected
        ? `${address?.slice(0, 6)}...${address?.slice(-4)}`
        : 'Connect Multi-Chain'}
    </button>
  );
}
