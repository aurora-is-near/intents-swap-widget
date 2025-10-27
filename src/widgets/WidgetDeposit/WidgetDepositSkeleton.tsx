import { SkeletonBox } from '@/components/SkeletonBox';

export const WidgetDepositSkeleton = () => (
  <div className="gap-sw-lg relative flex flex-col">
    <SkeletonBox className="h-[72px]" />
    <SkeletonBox className="h-[48px]" />
  </div>
);
