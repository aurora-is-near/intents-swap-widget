import { SkeletonBox } from '@/components/SkeletonBox';

export const WidgetSwapSkeleton = () => (
  <div className="w-full gap-sw-lg relative flex flex-col">
    <div className="gap-sw-lg relative flex flex-col">
      <SkeletonBox className="h-[108px]" />
      <SkeletonBox className="h-[108px]" />
    </div>

    <div className="gap-sw-lg relative flex flex-col">
      <SkeletonBox className="h-[44px]" />
      <SkeletonBox className="h-[48px]" />
    </div>
  </div>
);
