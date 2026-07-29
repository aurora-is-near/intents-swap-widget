import DisconnectIcon from 'reicon-react/icons/LinkBroken2';
import WalletPlusIcon from 'reicon-react/icons/WalletPlus';

import { Button } from '@/components/Button';

import { useWalletConnection } from '../../hooks/useWalletConnection';

const DisconnectButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="h-[56px] rounded-sw-lg bg-sw-status-error text-sw-gray-950/85 w-full text-sw-label-md flex items-center justify-center gap-sw-md hover:bg-sw-status-error/90 transition-colors cursor-pointer">
      <DisconnectIcon
        weight="Filled"
        strokeWidth={2.5}
        className="w-sw-xl h-sw-xl"
      />
      Disconnect wallet
    </button>
  );
};

type Props = {
  onClose: () => void;
};

export const WidgetConnectWalletButton = ({ onClose }: Props) => {
  const { walletSignIn, walletSignOut, isConnected } = useWalletConnection();

  const onClick = () => {
    if (isConnected) {
      if (!walletSignOut) {
        throw new Error(
          'A walletSignOut function was not provided via the widget config',
        );
      }

      walletSignOut?.();
      onClose();

      return;
    }

    if (!walletSignIn) {
      throw new Error(
        'A walletSignIn function was not provided via the widget config',
      );
    }

    walletSignIn?.();
    onClose();
  };

  return isConnected ? (
    <DisconnectButton onClick={onClick} />
  ) : (
    <Button
      size="lg"
      variant="primary"
      iconPosition="head"
      onClick={onClick}
      icon={WalletPlusIcon}>
      Connect wallet
    </Button>
  );
};
