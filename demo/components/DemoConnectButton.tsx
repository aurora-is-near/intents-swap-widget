interface DemoConnectButtonProps {
  walletAddress?: string;
  onConnect: () => void;
}

export const DemoConnectButton: React.FC<DemoConnectButtonProps> = ({
  walletAddress,
  onConnect,
}) => {
  if (walletAddress) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '-60px',
        left: '0',
        right: '0',
        zIndex: 10,
      }}>
      <button
        onClick={onConnect}
        className="demo-connect-wallet-button"
        style={{ width: '100%' }}>
        Connect Wallet
      </button>
    </div>
  );
};
