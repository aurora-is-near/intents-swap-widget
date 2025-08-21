import { useState } from 'react';
import * as Icons from 'lucide-react';
import type { ReactNode } from 'react';

import { Hr } from './Hr';
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
      isClickable
      className={className}
      onClick={() => setIsExpanded((p) => !p)}>
      <header className="align-center flex w-full justify-between">
        <span className="gap-ds-xs text-label-s mt-ds-xs flex text-center text-gray-100">
          {title}
        </span>
        {isBadgeLoading ? (
          <div className="ml-auto h-[20px] w-[100px] animate-pulse rounded-full bg-gray-700" />
        ) : (
          badge && <Badge>{badge}</Badge>
        )}
        <button type="button" className="ml-ds-lg cursor-pointer">
          {isExpanded ? (
            <Icons.ChevronUp className="h-ds-2xl w-ds-2xl text-gray-50" />
          ) : (
            <Icons.ChevronDown className="h-ds-2xl w-ds-2xl text-gray-50" />
          )}
        </button>
      </header>

      <div
        style={{ height: isExpanded ? expandedHeightPx : 0 }} // has to be inline for animation to work
        className="gap-ds-md flex flex-col overflow-hidden transition-all delay-0 duration-300 ease-in-out">
        <Hr className="mt-ds-xl mb-ds-md" />
        {children}
      </div>
    </Card>
  );
};
