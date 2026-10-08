import type { ReactNode } from 'react';

import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { Icon } from './Icon';

type Props = {
  /** Header title; with `onBack` it gets a back button. No title: no header. */
  title?: string;
  onBack?: () => void;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** A full-height panel screen: header, scrollable content, pinned footer. */
export const Screen = ({
  title,
  onBack,
  footer,
  children,
  className,
}: Props) => (
  <div className="sw flex h-screen flex-col bg-sw-gray-950 text-sw-gray-50">
    {title !== undefined && (
      <header className="flex h-[56px] shrink-0 items-center gap-sw-xs px-sw-md">
        {onBack && (
          <button
            type="button"
            aria-label="Back"
            title="Back"
            onClick={onBack}
            className="flex h-[40px] w-[40px] items-center justify-center rounded-sw-md text-sw-gray-200 hover:bg-sw-gray-900">
            <Icon name="back" />
          </button>
        )}
        <h1
          className={cn(
            'm-0 grow text-sw-label-lg text-sw-gray-50',
            !onBack && 'pl-sw-md',
          )}>
          {title}
        </h1>
      </header>
    )}
    <main
      className={cn(
        'flex min-h-[0px] grow flex-col gap-sw-xl overflow-y-auto px-sw-xl pb-sw-xl pt-sw-md',
        className,
      )}>
      {children}
    </main>
    {footer ? (
      <footer className="flex shrink-0 flex-col gap-sw-md px-sw-xl pb-sw-xl pt-sw-md">
        {footer}
      </footer>
    ) : null}
  </div>
);
