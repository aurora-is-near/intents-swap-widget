import { noop } from '@/utils/noop';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { InputAmount } from '@/components/InputAmount';

export const TokenInputSkeleton = () => (
  <Card className="gap-sw-lg flex flex-col">
    <div className="flex items-center justify-between">
      <InputAmount
        value=""
        name="test"
        placeholder="0"
        state="disabled"
        setValue={noop}
      />
      <div className="gap-sw-md pl-sw-sm pr-sw-md flex h-[36px] min-w-[80px] shrink-0 animate-pulse items-center rounded-sw-md bg-sw-gray-600" />
    </div>
    <div className="gap-sw-sm min-h-sw-2xl flex items-center justify-between">
      <Skeleton width={60} />
      <div className="gap-sw-sm flex items-center">
        <Skeleton width={100} />
      </div>
    </div>
  </Card>
);
