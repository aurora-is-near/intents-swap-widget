import copy from 'copy-text-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { ContentCopyW700 as ContentCopy } from '@material-symbols-svg/react-rounded/icons/content-copy';
import { CheckFillW700 as Check } from '@material-symbols-svg/react-rounded/icons/check';

import { cn } from '@/utils/cn';

type Props = {
  value: string;
  className?: string;
};

export const CopyButton = ({ value, className }: Props) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const handleClick = () => {
    copy(value);
    setCopied(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => setCopied(false), 3000);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'cursor-pointer transition-all duration-300 [transition-timing-function:cubic-bezier(0.175,0.885,0.32,1.275)] active:-translate-y-1 active:scale-x-90 active:scale-y-110',
        copied
          ? 'text-sw-status-success'
          : 'text-sw-gray-200 hover:text-sw-gray-50',
        className,
      )}>
      {copied ? <Check size={16} /> : <ContentCopy size={16} />}
    </button>
  );
};
