import { Code, ExternalLink, Menu } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';

import CopyIcon from '../assets/icons/copy.svg?react';
import CheckIcon from '../assets/icons/check-circle.svg?react';

import { HeaderButton } from './HeaderButton';
import { AuthButton } from './auth';
import { useSharableLink } from '@/hooks/useSharableLink';

type HeaderProps = {
  onOpenDrawer?: () => void;
  onOpenExportModal: () => void;
};

export function Header({ onOpenDrawer, onOpenExportModal }: HeaderProps) {
  const { authenticated } = usePrivy();
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const { copySharableLink, isSharableLinkAvailable } = useSharableLink();

  const copyConfigLink = async () => {
    const sharableLink = await copySharableLink();

    if (!sharableLink) {
      return;
    }

    setCopyLinkFeedback(true);
    setTimeout(() => setCopyLinkFeedback(false), 2000);
  };

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
        {authenticated && isSharableLinkAvailable && (
          <HeaderButton
            variant={copyLinkFeedback ? 'success' : 'dark'}
            LeadingIcon={copyLinkFeedback ? CheckIcon : CopyIcon}
            onClick={copyConfigLink}>
            {copyLinkFeedback ? 'Copied!' : 'Copy shareable link'}
          </HeaderButton>
        )}
        <HeaderButton
          variant="primary"
          LeadingIcon={Code}
          onClick={onOpenExportModal}>
          Export code
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
