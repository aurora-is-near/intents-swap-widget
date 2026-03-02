import { Card } from '@/components/Card';
import { SkeletonBox } from '@/components/SkeletonBox';

const SkeletonCard = () => (
  <Card padding="none">
    <div className="p-sw-lg flex flex-col gap-sw-md">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-[16px] w-[100px]" />
        <SkeletonBox className="h-[14px] w-[50px]" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sw-md">
          <SkeletonBox className="h-[28px] w-[28px] rounded-full" />
          <SkeletonBox className="h-[16px] w-[80px]" />
        </div>
        <SkeletonBox className="h-[16px] w-[70px]" />
      </div>
    </div>
  </Card>
);

export const TransactionHistorySkeleton = () => (
  <div className="flex flex-col gap-sw-md w-full">
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </div>
);
