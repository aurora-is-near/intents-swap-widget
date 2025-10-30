import { Button } from '@aurora-is-near/intents-swap-widget';
import { useAppKitWallet } from '../hooks/useAppKitWallet';

export const AppKitWalletButton = () => {
  const { connect, address, isConnected } = useAppKitWallet();

  const displayText =
    isConnected && address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : 'Connect';

  return (
    <Button fluid variant="primary" size="md" onClick={() => connect()}>
      {displayText}
    </Button>
  );
};
