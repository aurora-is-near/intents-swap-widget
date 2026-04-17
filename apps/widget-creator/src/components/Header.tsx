import { Code, ExternalLink, Menu } from 'lucide-react';

import { HeaderButton } from './HeaderButton';
import { AuthButton } from './auth';

type HeaderProps = {
  onOpenDrawer?: () => void;
  onOpenExportModal: () => void;
};

export function Header({ onOpenDrawer, onOpenExportModal }: HeaderProps) {
  return (
    <header className="w-full flex items-center justify-between px-csw-2xl sm:px-csw-auto">
      <div className="gap-csw-2xl items-center flex">
        <div className="font-medium text-lg sm:text-xl tracking-[-0.5px] text-csw-gray-100 flex flex-row items-center whitespace-nowrap">
          <img
            src="/images/near-intents-logo.png"
            alt="Intents Logo"
            className="w-[106px] sm:w-[114px] h-auto relative bottom-[0.5px]"
          />
          Widget Studio
        </div>
        <HeaderButton
          TrailingIcon={ExternalLink}
          href="https://docs.intents.aurora.dev/getting-started"
          target="_blank"
          className="hidden sm:flex flex-row items-center bg-csw-gray-900 rounded-csw-md px-csw-lg py-csw-2md hover:bg-csw-gray-800 transition-colors duration-100 font-semibold text-xs tracking-[-0.4px] text-csw-gray-200 whitespace-nowrap">
          Get started guide
        </HeaderButton>
      </div>

      {/* Desktop nav */}
      <nav className="hidden lg:flex gap-csw-2md items-center">
        <HeaderButton
          variant="primary"
          LeadingIcon={Code}
          onClick={onOpenExportModal}>
          Embed in your app
        </HeaderButton>
        <AuthButton />
      </nav>

      {/* Mobile hamburger */}
      <nav className="flex lg:hidden gap-csw-2md items-center ml-auto">
        <HeaderButton variant="dark" LeadingIcon={Menu} onClick={onOpenDrawer}>
          Menu
        </HeaderButton>
      </nav>
    </header>
  );
}
