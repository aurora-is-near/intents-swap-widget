import { cn } from '@/utils/cn';

type Props = {
  className?: string;
};

export const Hr = ({ className }: Props) => (
  <hr className={cn('h-[1px] w-full border-none bg-sw-gray-800', className)} />
);
