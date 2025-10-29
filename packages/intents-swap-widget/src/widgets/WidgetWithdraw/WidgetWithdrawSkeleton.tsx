import { SkeletonBox } from '@/components/SkeletonBox';

export const WidgetWithdrawSkeleton = () => (
  <div className="gap-sw-lg relative flex flex-col">
    <SkeletonBox className="h-[120px]" />
    <SkeletonBox className="h-[120px]" />
    <SkeletonBox className="h-[48px]" />
  </div>
);
