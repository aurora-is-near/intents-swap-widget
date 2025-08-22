import { Card } from '@/components/Card';

export const SwapQuoteSkeleton = () => (
  <Card className="flex h-[52px] items-center justify-between">
    <div className="h-[20px] w-[200px] animate-pulse rounded-full bg-sw-gray-700" />
    <div className="h-[20px] w-[100px] animate-pulse rounded-full bg-sw-gray-700" />
  </Card>
);
