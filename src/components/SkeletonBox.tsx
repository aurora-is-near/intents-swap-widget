import { cn } from '@/utils/cn';

export const SkeletonBox = ({ className }: { className: string }) => (
  <div
    className={cn('animate-pulse rounded-sw-lg bg-sw-gray-800', className)}
  />
);
