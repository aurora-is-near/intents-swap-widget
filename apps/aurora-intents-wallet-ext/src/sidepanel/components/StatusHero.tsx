import type { ReactNode } from 'react';

import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { Icon, Spinner } from './Icon';

type Tone = 'pending' | 'success' | 'error';

type Props = {
  tone: Tone;
  title: string;
  description: ReactNode;
  children?: ReactNode;
};

const BADGE: Record<Exclude<Tone, 'pending'>, string> = {
  success: 'bg-sw-status-success',
  error: 'bg-sw-status-error',
};

/** The centred icon + title + copy block of pending/success/error screens. */
export const StatusHero = ({ tone, title, description, children }: Props) => (
  <div className="flex flex-col items-center gap-sw-xl px-sw-md pb-sw-3xl pt-sw-5xl text-center">
    {tone === 'pending' ? (
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-sw-lg bg-sw-gray-900">
        <Spinner />
      </div>
    ) : (
      <div
        className={cn(
          'flex h-[56px] w-[56px] items-center justify-center rounded-sw-lg text-sw-gray-950',
          BADGE[tone],
        )}>
        <Icon name={tone === 'success' ? 'check' : 'close'} size={28} />
      </div>
    )}
    <div className="flex flex-col items-center gap-sw-md">
      <h2 className="m-0 text-sw-h5 text-sw-gray-50">{title}</h2>
      {/* A div: descriptions may hold inline icons (block elements). */}
      <div className="m-0 max-w-[300px] text-sw-body-md text-sw-gray-200">
        {description}
      </div>
    </div>
    {children}
  </div>
);
