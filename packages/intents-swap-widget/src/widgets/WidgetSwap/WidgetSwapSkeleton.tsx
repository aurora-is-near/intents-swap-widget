import { SkeletonBox } from '@/components/SkeletonBox';

export const WidgetSwapSkeleton = () => (
  <div className="gap-sw-lg relative flex flex-col w-full">
    <div className="gap-sw-lg relative flex flex-col w-full">
      <div className="gap-sw-lg relative flex flex-col w-full">
        <SkeletonBox className="h-[72px]" />
        <SkeletonBox className="h-[72px]" />
      </div>
      <SkeletonBox className="h-[48px]" />
    </div>
  </div>
);
