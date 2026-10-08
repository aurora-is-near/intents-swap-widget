import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';

const Option = ({
  icon,
  title,
  description,
  onClick,
}: {
  icon: IconName;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-sw-lg rounded-sw-lg bg-sw-gray-900 p-sw-xl text-left text-sw-gray-50 hover:bg-sw-gray-800">
    <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-sw-md bg-sw-gray-800 text-sw-accent-300">
      <Icon name={icon} size={22} />
    </span>
    <span className="flex min-w-[0px] grow flex-col gap-sw-xs">
      <span className="text-sw-label-md text-sw-gray-50">{title}</span>
      <span className="text-sw-body-sm text-sw-gray-300">{description}</span>
    </span>
    <span className="text-sw-gray-300">
      <Icon name="chevronRight" size={18} />
    </span>
  </button>
);

export const ConnectWalletScreen = () => {
  const { push, back } = useNavigation();

  return (
    <Screen title="Connect existing wallet" onBack={back}>
      <p className="m-0 text-sw-body-md text-sw-gray-200">
        Use a wallet you already have. Your assets stay in it — Aurora Intents
        only asks it to sign swaps and transfers.
      </p>
      <div className="flex flex-col gap-sw-md">
        <Option
          icon="browser"
          title="Browser wallet"
          description="MetaMask, Phantom, Rabby and other installed extensions"
          onClick={() => push({ name: 'browserWallets' })}
        />
        <Option
          icon="qr"
          title="Mobile wallet"
          description="Scan a QR code with your phone wallet using WalletConnect"
          onClick={() => push({ name: 'walletConnect' })}
        />
      </div>
      <div className="flex items-start gap-sw-md rounded-sw-md bg-sw-gray-900 p-sw-lg">
        <span className="text-sw-gray-300">
          <Icon name="shield" size={18} />
        </span>
        <p className="m-0 text-sw-body-sm text-sw-gray-300">
          We never see your private keys. You can disconnect at any time from
          Settings.
        </p>
      </div>
    </Screen>
  );
};
