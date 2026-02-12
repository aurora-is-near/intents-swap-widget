import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { PersonFillW700 as Person } from '@material-symbols-svg/react-rounded/icons/person';
import { useWalletConnection } from '../../hooks/useWalletConnection';
import { useConfig } from '../../config';

export const WidgetProfileButton = () => {
  const { walletSignIn, walletSignOut } = useWalletConnection();
  const { connectedWallets } = useConfig();
  const isConnected = Object.values(connectedWallets).some((addr) => !!addr);

  const onClick = () => {
    if (isConnected) {
      if (!walletSignOut) {
        throw new Error(
          'A walletSignOut function was not provided via the widget config',
        );

        return;
      }

      walletSignOut?.();

      return;
    }

    if (!walletSignIn) {
      throw new Error(
        'A walletSignIn function was not provided via the widget config',
      );

      return;
    }

    walletSignIn?.();
  };

  return (
    <Menu>
      <MenuButton>
        <div className="px-sw-md cursor-pointer">
          <Person className="w-sw-2xl h-sw-2xl text-sw-gray-200" />
        </div>
      </MenuButton>
      <MenuItems anchor="bottom" className="mt-sw-lg">
        <MenuItem>
          <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-sw-md px-sw-lg py-sw-sm rounded-sw-sm text-sm text-sw-gray-200 bg-sw-gray-900 border border-sw-gray-800 select-none cursor-pointer data-focus:outline-none">
            {isConnected ? 'Disconnect' : 'Connect Wallet'}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};
