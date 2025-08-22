import * as Icons from 'lucide-react';

import { cn } from '@/utils/cn';
import { Button } from '@/components/Button';

type Props = {
  className?: string;
  onResetSearch: () => void;
};

export const TokensListPlaceholder = ({ onResetSearch, className }: Props) => (
  <div
    className={cn(
      'py-sw-lg gap-sw-2xl flex flex-col items-center justify-center text-sw-gray-100',
      className,
    )}>
    <div className="gap-sw-md flex items-center">
      <Icons.SearchX size={16} />
      <span className="text-sw-label-m">No tokens match your search</span>
    </div>
    <Button
      variant="primary"
      size="md"
      className="w-fit"
      onClick={onResetSearch}>
      Reset search
    </Button>
  </div>
);
