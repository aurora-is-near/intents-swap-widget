import DisconnectIcon from 'reicon-react/icons/LinkBroken2';
import WalletPlusIcon from 'reicon-react/icons/WalletPlus';

import { useTypedTranslation } from '@/localisation';

import { useWalletConnection } from '../../hooks/useWalletConnection';

const ConnectButton = ({
  isConnected,
  onClick,
}: {
  isConnected: boolean;
  onClick: () => void;
}) => {
  const { t } = useTypedTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className="h-[36px] px-sw-xl rounded-sw-md bg-sw-gray-950 text-sw-gray-100 text-sw-label-md flex items-center justify-center gap-sw-md hover:text-sw-gray-50 hover:bg-sw-gray-800 transition-colors cursor-pointer">
      {isConnected ? (
        <DisconnectIcon
          weight="Filled"
          strokeWidth={2.5}
          className="w-sw-xl h-sw-xl"
        />
      ) : (
        <WalletPlusIcon weight="Filled" className="w-sw-xl h-sw-xl" />
      )}
      {isConnected
        ? t('submit.error.disconnectWallet', 'Disconnect wallet')
        : t('submit.error.connectWallet', 'Connect wallet')}
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

  return (
    <div className="w-full flex justify-end">
      <ConnectButton isConnected={isConnected} onClick={onClick} />
    </div>
  );
};
