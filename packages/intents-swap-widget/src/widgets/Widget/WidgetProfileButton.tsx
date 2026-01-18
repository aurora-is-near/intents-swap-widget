import { CircleUserRound } from 'lucide-react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useAppKitWallet } from '../../hooks';

export const WidgetProfileButton = () => {
  const { isConnected, connect, disconnect } = useAppKitWallet();

  return (
    <Menu>
      <MenuButton>
        <div className="px-sw-md cursor-pointer">
          <CircleUserRound className="w-sw-2xl h-sw-2xl text-sw-gray-200" />
        </div>
      </MenuButton>
      <MenuItems anchor="bottom" className="mt-sw-lg">
        <MenuItem>
          <button
            type="button"
            onClick={isConnected ? disconnect : connect}
            className="w-full flex items-center gap-sw-md px-sw-lg py-sw-sm rounded-sw-sm text-sm text-sw-gray-200 bg-sw-gray-900 border border-sw-gray-800 select-none cursor-pointer data-focus:outline-none">
            {isConnected ? 'Disconnect' : 'Connect Wallet'}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};
