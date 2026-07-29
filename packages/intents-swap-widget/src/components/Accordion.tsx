import { useState } from 'react';
import ChevronUpIcon from 'reicon-react/icons/ChevronUp';
import ChevronDownIcon from 'reicon-react/icons/ChevronDown';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { Card } from './Card';
import { Badge } from './Badge';

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
      padding="none"
      className={cn('rounded-sw-md px-sw-xs py-sw-lg', className)}>
      <div className="flex w-full items-center justify-between h-sw-xl">
        <header
          onClick={() => setIsExpanded((p) => !p)}
          className={cn(
            'items-center flex w-full justify-between p-sw-md rounded-sw-sm cursor-pointer',
            {
              'bg-sw-gray-800': isExpanded,
              'bg-transparent': !isExpanded,
            },
          )}>
          <span className="gap-sw-xs text-sw-label-sm flex text-center text-sw-gray-200">
            {title}
          </span>
          {isBadgeLoading ? (
            <div className="flex items-center justify-center h-sw-xl ml-auto">
              <div className="ml-auto h-[20px] w-[100px] animate-pulse rounded-full bg-sw-gray-800" />
            </div>
          ) : (
            badge && (
              <div className="flex items-center justify-center h-sw-xl ml-auto">
                <Badge>{badge}</Badge>
              </div>
            )
          )}
          <button
            type="button"
            className="ml-sw-lg cursor-pointer text-sw-gray-200">
            {isExpanded ? (
              <ChevronUpIcon
                weight="Outline"
                strokeWidth={3}
                className="h-sw-lg w-sw-lg"
              />
            ) : (
              <ChevronDownIcon
                weight="Outline"
                strokeWidth={3}
                className="h-sw-lg w-sw-lg"
              />
            )}
          </button>
        </header>
      </div>

      <div
        style={{ height: isExpanded ? expandedHeightPx : 0 }} // has to be inline for animation to work
        className="px-sw-lg gap-sw-md flex flex-col overflow-hidden transition-all delay-0 duration-300 ease-in-out">
        {children}
      </div>
    </Card>
  );
};
