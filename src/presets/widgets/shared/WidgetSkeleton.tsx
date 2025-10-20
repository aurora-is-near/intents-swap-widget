import { cn } from '@/utils/cn';

const SkeletonBox = ({ className }: { className: string }) => (
  <div className={cn('animate-pulse rounded-lg bg-sw-gray-800', className)} />
);

export const WidgetSkeleton = {
  Swap: () => (
    <div className="gap-sw-lg relative flex flex-col">
      <div className="gap-sw-lg relative flex flex-col">
        <div className="gap-sw-lg relative flex flex-col">
          <SkeletonBox className="h-[72px]" />
          <SkeletonBox className="h-[72px]" />
        </div>
        <SkeletonBox className="h-[48px]" />
      </div>
    </div>
  ),

  Deposit: () => (
    <div className="gap-sw-lg relative flex flex-col">
      <SkeletonBox className="h-[72px]" />
      <SkeletonBox className="h-[48px]" />
    </div>
  ),

  Withdraw: () => (
    <div className="gap-sw-lg relative flex flex-col">
      <SkeletonBox className="h-[120px]" />
      <SkeletonBox className="h-[120px]" />
      <SkeletonBox className="h-[48px]" />
    </div>
  ),
};
