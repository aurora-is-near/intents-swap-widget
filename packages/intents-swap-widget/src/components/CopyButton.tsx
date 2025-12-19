import copy from 'copy-text-to-clipboard';
import * as Icons from 'lucide-react';

import { cn } from '@/utils/cn';

type Props = {
  value: string;
  className?: string;
};

export const CopyButton = ({ value, className }: Props) => (
  <button
    type="button"
    onClick={() => copy(value)}
    className={cn(
      'text-sw-gray-200 hover:text-sw-gray-50 cursor-pointer transition-all duration-300 [transition-timing-function:cubic-bezier(0.175,0.885,0.32,1.275)] active:-translate-y-1 active:scale-x-90 active:scale-y-110',
      className,
    )}>
    <Icons.Copy size={16} />
  </button>
);
