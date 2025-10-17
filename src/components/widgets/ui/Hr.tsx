import { cn } from '@/utils/cn';

type Props = {
  className?: string;
};

export const WidgetHr = ({ className }: Props) => (
  <hr className={cn('h-[1px] w-full border-none bg-sw-gray-700', className)} />
);
