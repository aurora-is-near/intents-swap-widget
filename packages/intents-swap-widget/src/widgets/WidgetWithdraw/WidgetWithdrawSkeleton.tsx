import { SkeletonBox } from '@/components/SkeletonBox';

export const WidgetWithdrawSkeleton = () => (
  <div className="w-full gap-sw-xl relative flex flex-col">
    <div className="gap-sw-lg relative flex flex-col">
      <SkeletonBox className="h-[157px]" />
      <SkeletonBox className="h-[157px]" />
      <SkeletonBox className="h-[152px]" />
    </div>

    <div className="gap-sw-lg relative flex flex-col">
      <SkeletonBox className="h-[120px]" />
      <SkeletonBox className="h-[48px]" />
    </div>
  </div>
);
