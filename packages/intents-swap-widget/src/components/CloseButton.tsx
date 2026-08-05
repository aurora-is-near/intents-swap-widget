import CloseIcon from 'reicon-react/icons/X';

import { cn } from '@/utils';

type Props = {
  className?: string;
  transparent?: boolean;
  onClick: () => void;
};

export const CloseButton = ({ className, onClick, transparent }: Props) => {
  return (
    <button
      type="button"
      className={cn(
        'flex cursor-pointer items-center justify-center text-sw-gray-200 transition-colors hover:text-sw-gray-50 p-sw-sm w-sw-4xl h-sw-4xl rounded-sw-md hover:bg-sw-gray-800',
        !transparent && 'bg-sw-gray-950',
        className,
      )}
      onClick={onClick}>
      <CloseIcon weight="Filled" strokeWidth={3} className="w-sw-xl h-sw-xl" />
    </button>
  );
};
