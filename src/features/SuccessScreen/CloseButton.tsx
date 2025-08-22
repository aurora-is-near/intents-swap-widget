import * as Icons from 'lucide-react';

type Props = {
  onClick: () => void;
};

export const CloseButton = ({ onClick }: Props) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-[44px] w-[44px] cursor-pointer items-center justify-center text-sw-gray-100 hover:text-sw-gray-50">
    <Icons.X size={22} />
  </button>
);
