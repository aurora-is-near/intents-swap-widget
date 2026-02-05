import { useEffect, useRef, useState } from 'react';
import {
  Book,
  Code,
  Link,
  LogIn,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { CloseW700 as Close } from '@material-symbols-svg/react-rounded/icons/close';
import { useLogin, useLogout, usePrivy } from '@privy-io/react-auth';
import { cn } from '../utils/cn';
import { useConfigLink } from '../hooks/useConfigLink';
import { CreatorPanel } from './creatorPanel/CreatorPanel';
import { MenuItem } from './MenuItem';

type DrawerView = 'menu' | 'customize';

type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenExportModal: () => void;
};

export const Menu = ({ isOpen, onClose, onOpenExportModal }: DrawerProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<DrawerView>('menu');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const { copyConfigLink } = useConfigLink();
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
      setView('menu');
    }
  }, [isOpen]);

  const handleCopyLink = async () => {
    await copyConfigLink();
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleAuth = async () => {
    if (authenticated) {
      await logout();
    } else {
      login();
    }

    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label="Main menu"
      className="fixed inset-0 size-auto max-h-none max-w-none overflow-hidden bg-transparent lg:hidden">
      <div
        className={cn(
          'absolute inset-0 w-full h-full',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}>
        <div className="flex h-full w-full flex-col bg-[#1D1E24]">
          {/* Header */}
          <div
            className={cn(
              'flex items-center justify-end py-csw-lg',
              isOpen ? 'pr-csw-md pl-csw-2xl' : 'px-csw-2xl',
            )}>
            <button
              type="button"
              onClick={onClose}
              className="rounded-csw-md p-csw-md text-csw-gray-200 hover:text-csw-gray-50 transition-colors cursor-pointer w-[44px] h-[44px]">
              <span className="sr-only">Close panel</span>
              <Close className="size-6" />
            </button>
          </div>

          {/* Content */}
          {view === 'menu' ? (
            <nav className="flex flex-col px-csw-2xl gap-csw-md sm:items-center">
              <MenuItem
                icon={<SlidersHorizontal className="size-5" />}
                label="Customize"
                onClick={() => setView('customize')}
              />
              <MenuItem
                icon={<Code className="size-5" />}
                label="Export code"
                onClick={onOpenExportModal}
              />
              <MenuItem
                icon={<Link className="size-5" />}
                label={copyFeedback ? 'Copied!' : 'Copy shareable link'}
                onClick={handleCopyLink}
              />
              <MenuItem
                icon={<Book className="size-5" />}
                label="Get started guide"
                href="https://aurora-labs.gitbook.io/intents-swap-widget/getting-started"
              />
              {ready && (
                <MenuItem
                  icon={
                    authenticated ? (
                      <LogOut className="size-5" />
                    ) : (
                      <LogIn className="size-5" />
                    )
                  }
                  label={authenticated ? 'Logout' : 'Login'}
                  onClick={handleAuth}
                />
              )}
            </nav>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <CreatorPanel />
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
};
