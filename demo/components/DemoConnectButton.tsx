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
        marginTop: 20,
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
