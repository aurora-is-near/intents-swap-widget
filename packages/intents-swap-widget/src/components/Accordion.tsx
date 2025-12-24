import { useState } from 'react';
import { ChevronLeft } from '@material-symbols-svg/react-rounded/w700';
import type { ReactNode } from 'react';

import { Hr } from './Hr';
import { Card } from './Card';
import { Badge } from './Badge';
import { cn } from '@/utils/cn';

type Props = {
  title: ReactNode;
  badge?: string;
  isBadgeLoading?: boolean;
  expandedByDefault?: boolean;
  children: ReactNode | ReactNode[];
  expandedHeightPx: number;
  className?: string;
};

export const Accordion = ({
  title,
  badge,
  children,
  isBadgeLoading,
  expandedHeightPx,
  expandedByDefault = false,
  className,
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(expandedByDefault);

  return (
    <Card
      isClickable
      className={cn('py-sw-lg', className)}
      onClick={() => setIsExpanded((p) => !p)}>
      <header className="align-center flex w-full justify-between">
        <span className="gap-sw-xs text-sw-label-md mt-sw-xs flex text-center text-sw-gray-200">
          {title}
        </span>
        {isBadgeLoading ? (
          <div className="ml-auto h-[20px] w-[100px] animate-pulse rounded-full bg-sw-gray-800" />
        ) : (
          badge && <Badge>{badge}</Badge>
        )}
        <button type="button" className="ml-sw-lg cursor-pointer">
          {isExpanded ? (
            <ChevronLeft className="h-sw-2xl w-sw-2xl text-sw-gray-200 rotate-90" />
          ) : (
            <ChevronLeft className="h-sw-2xl w-sw-2xl text-sw-gray-200 -rotate-90" />
          )}
        </button>
      </header>

      <div
        style={{ height: isExpanded ? expandedHeightPx : 0 }} // has to be inline for animation to work
        className="gap-sw-md flex flex-col overflow-hidden transition-all delay-0 duration-300 ease-in-out">
        <Hr className="mt-sw-xl mb-sw-md" />
        {children}
      </div>
    </Card>
  );
};
