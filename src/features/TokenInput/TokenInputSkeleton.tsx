import { noop } from '@/utils/noop';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { InputAmount } from '@/components/InputAmount';

export const TokenInputSkeleton = () => (
  <Card className="gap-ds-2xl flex flex-col">
    <div className="flex items-center justify-between">
      <InputAmount
        value=""
        name="test"
        placeholder="0"
        state="disabled"
        setValue={noop}
      />
      <div className="gap-ds-md pl-ds-sm pr-ds-md flex h-[36px] min-w-[80px] shrink-0 animate-pulse items-center rounded-md bg-gray-600" />
    </div>
    <div className="gap-ds-sm min-h-ds-2xl flex items-center justify-between">
      <Skeleton width={60} />
      <div className="gap-ds-sm flex items-center">
        <Skeleton width={100} />
      </div>
    </div>
  </Card>
);
