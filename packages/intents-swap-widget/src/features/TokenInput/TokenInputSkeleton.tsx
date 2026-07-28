import { noop } from '@/utils/noop';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { InputAmount } from '@/components/InputAmount';

export const TokenInputSkeleton = () => (
  <Card className="gap-sw-lg flex flex-col px-sw-2xl h-[120px]">
    <div className="flex items-center justify-between">
      <InputAmount
        value=""
        name="test"
        placeholder="0"
        state="disabled"
        setValue={noop}
      />
      <div className="h-[36px] flex items-center justify-center">
        <div className="pl-sw-sm pr-sw-md h-[40px] min-w-[80px] shrink-0 animate-pulse rounded-sw-md bg-sw-gray-600" />
      </div>
    </div>
    <div className="gap-sw-sm min-h-sw-2xl flex items-center justify-between">
      <Skeleton width={60} />
      <div className="gap-sw-sm flex items-center">
        <Skeleton width={100} />
      </div>
    </div>
  </Card>
);
