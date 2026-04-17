import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { PersonFillW700 as Person } from '@material-symbols-svg/react-rounded/icons/person';

import { useWalletConnection } from '../../hooks/useWalletConnection';
import { useTheme } from '@/hooks/useTheme';
import { getThemeCssVariables } from '@/theme/getThemeCssVariables';

export const WidgetProfileButton = () => {
  const { walletSignIn, walletSignOut, isConnected } = useWalletConnection();
  const theme = useTheme();
  const themeCssVariables = getThemeCssVariables(theme);

  const onClick = () => {
    if (isConnected) {
      if (!walletSignOut) {
        throw new Error(
          'A walletSignOut function was not provided via the widget config',
        );
      }

      walletSignOut?.();

      return;
    }

    if (!walletSignIn) {
      throw new Error(
        'A walletSignIn function was not provided via the widget config',
      );
    }

    walletSignIn?.();
  };

  return (
    <Menu>
      <MenuButton className="outline-none">
        <div className="px-sw-md cursor-pointer">
          <Person className="w-sw-2xl h-sw-2xl text-sw-gray-200 hover:text-sw-gray-50" />
        </div>
      </MenuButton>
      <MenuItems
        anchor="bottom"
        style={themeCssVariables}
        className="sw mt-sw-lg outline-none">
        <MenuItem>
          <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-sw-md outline-none px-sw-lg py-sw-sm rounded-sw-sm text-sm text-sw-gray-200 bg-sw-gray-900 border border-sw-gray-800 select-none cursor-pointer data-focus:outline-none">
            {isConnected ? 'Disconnect' : 'Connect Wallet'}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};
