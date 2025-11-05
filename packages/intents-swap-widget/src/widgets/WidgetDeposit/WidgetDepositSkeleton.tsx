import { SkeletonBox } from '@/components/SkeletonBox';

export const WidgetDepositSkeleton = () => (
  <div className="w-full gap-sw-xl relative flex flex-col">
    <SkeletonBox className="h-[108px]" />
    <SkeletonBox className="h-[116px]" />

    <div className="gap-sw-lg relative flex flex-col">
      <SkeletonBox className="h-[44px]" />
      <SkeletonBox className="h-[48px]" />
    </div>
  </div>
);
