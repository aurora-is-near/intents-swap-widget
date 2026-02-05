import { Code, ExternalLink, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';

import CopyIcon from '../assets/icons/copy.svg?react';
import CheckIcon from '../assets/icons/check-circle.svg?react';
import AuroraIcon from '../assets/icons/aurora.svg?react';

import { useConfigLink, useDecodeConfigLink } from '../hooks/useConfigLink';

import { HeaderButton } from './HeaderButton';
import { AuthButton } from './auth';

type HeaderProps = {
  onOpenDrawer?: () => void;
  onOpenExportModal: () => void;
};

export function Header({ onOpenDrawer, onOpenExportModal }: HeaderProps) {
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);
  const { copyConfigLink: originalCopyConfigLink } = useConfigLink();
  const { decodeConfigLink } = useDecodeConfigLink();

  const copyConfigLink = async () => {
    await originalCopyConfigLink();
    setCopyLinkFeedback(true);
    setTimeout(() => setCopyLinkFeedback(false), 2000);
  };

  useEffect(() => {
    const currentUrl = window.location.href;
    const params = new URLSearchParams(window.location.search);

    // Check if there are any config parameters in the URL
    if (params.toString()) {
      decodeConfigLink(currentUrl);
    }
  }, []);

  return (
    <header className="w-full flex items-center justify-between px-csw-2xl sm:px-csw-auto">
      <div className="gap-csw-2xl items-center flex">
        <span className="font-medium text-xl tracking-[-0.5px] text-csw-gray-100 flex flex-row whitespace-nowrap">
          <AuroraIcon className="w-[25px] h-[25px] text-csw-gray-100 mr-csw-lg sm:mr-csw-xl" />
          Intents Widget
        </span>
        <HeaderButton
          TrailingIcon={ExternalLink}
          href="https://aurora-labs.gitbook.io/intents-swap-widget/getting-started"
          target="_blank"
          className="hidden md:flex flex-row items-center bg-csw-gray-900 rounded-csw-md px-csw-lg py-csw-2md hover:bg-csw-gray-800 transition-colors duration-100 font-semibold text-xs tracking-[-0.4px] text-csw-gray-200 whitespace-nowrap">
          Get started guide
        </HeaderButton>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:flex gap-csw-2md items-center">
        <HeaderButton
          variant={copyLinkFeedback ? 'success' : 'dark'}
          LeadingIcon={copyLinkFeedback ? CheckIcon : CopyIcon}
          onClick={copyConfigLink}>
          {copyLinkFeedback ? 'Copied!' : 'Copy shareable link'}
        </HeaderButton>
        <HeaderButton
          variant="primary"
          LeadingIcon={Code}
          onClick={onOpenExportModal}>
          Export code
        </HeaderButton>
        <AuthButton />
      </nav>

      {/* Mobile hamburger */}
      <nav className="flex md:hidden gap-csw-2md items-center ml-auto">
        <HeaderButton variant="dark" LeadingIcon={Menu} onClick={onOpenDrawer}>
          Menu
        </HeaderButton>
      </nav>
    </header>
  );
}
