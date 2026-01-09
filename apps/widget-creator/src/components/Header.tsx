import { ArrowUpRight, Code } from 'lucide-react';
import { useEffect, useState } from 'react';
import CopyIcon from '../assets/icons/copy.svg?react';
import CheckIcon from '../assets/icons/check-circle.svg?react';
import { Button, OutlinedButton } from '../uikit/Button';
import { ExportModal } from './ExportModal';
import { useConfigLink, useDecodeConfigLink } from '../hooks/useConfigLink';

export function Header() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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
    <>
      <header className="backdrop-blur-[20px] backdrop-filter bg-csw-gray-950 rounded-csw-lg w-full flex items-center justify-between px-csw-2xl py-[11px]">
        <aside className="flex gap-[20px] md:gap-[44px] items-center">
          <nav className="gap-csw-xl md:gap-csw-5xl items-center hidden md:flex">
            <a href="#" className="flex gap-2.5 items-center justify-center">
              <span className="font-medium text-xs leading-3 tracking-[1px] uppercase text-csw-accent-50 whitespace-nowrap">
                WIDGET STUDIO
              </span>
            </a>
            <a href="#" className="flex gap-csw-md items-center">
              <span className="font-medium text-xs leading-3 tracking-[1px] uppercase text-csw-gray-200 whitespace-nowrap">
                DOCS
              </span>
              <ArrowUpRight className="w-csw-xl h-csw-xl text-csw-gray-200" />
            </a>
          </nav>
        </aside>

        <aside className="flex gap-csw-2md items-center">
          <OutlinedButton
            size="sm"
            fluid
            onClick={copyConfigLink}
            state={copyLinkFeedback ? 'active' : 'default'}>
            {copyLinkFeedback ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <CopyIcon className="w-4 h-4" />
            )}
            <span
              className={`text-sm font-medium leading-4 hidden md:inline ${copyLinkFeedback ? 'text-csw-status-success' : 'text-csw-gray-50'}`}>
              {copyLinkFeedback ? 'Copied!' : 'Copy shareable link'}
            </span>
          </OutlinedButton>
          <Button
            variant="primary"
            size="sm"
            fluid
            onClick={() => setIsExportModalOpen(true)}>
            <Code className="w-[16px] h-[16px]" strokeWidth={3} />
            <span className="text-sm font-medium leading-4 text-csw-gray-950 hidden md:inline">
              Export code
            </span>
          </Button>
        </aside>
      </header>
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </>
  );
}
