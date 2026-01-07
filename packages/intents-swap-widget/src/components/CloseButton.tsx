import { CloseW700 as Close } from '@material-symbols-svg/react-rounded/icons/close';

import { cn } from '@/utils';

type Props = {
  className?: string;
  onClick: () => void;
};

export const CloseButton = ({ className, onClick }: Props) => {
  return (
    <button
      type="button"
      className={cn(
        'flex cursor-pointer items-center justify-center text-sw-gray-200 transition-colors hover:text-sw-gray-50 p-sw-md w-[34px] h-[34px] rounded-sw-md bg-sw-gray-950 hover:bg-sw-gray-800',
        className,
      )}
      onClick={onClick}>
      <Close size={18} />
    </button>
  );
};
