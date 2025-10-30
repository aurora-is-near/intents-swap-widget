import { Button } from '@aurora-is-near/intents-swap-widget';
import {
  useTonAddress,
  useTonConnectModal,
  useTonConnectUI,
} from '@tonconnect/ui-react';

export const TonWalletButton = () => {
  const address = useTonAddress();
  const { open } = useTonConnectModal();
  const [tonConnectUI] = useTonConnectUI();

  const displayText = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'Connect';

  const onClick = () => {
    if (address) {
      void tonConnectUI.disconnect();

      return;
    }

    open();
  };

  return (
    <Button fluid variant="primary" size="md" onClick={onClick}>
      {displayText}
    </Button>
  );
};
