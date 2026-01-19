import clsx from 'clsx';

import { SkeletonBox } from '@/components/SkeletonBox';
import { useUnsafeSnapshot } from '@/machine/snap';
import { useConfig } from '@/config';

export const WidgetDepositSkeleton = () => {
  const { hideTokenInputHeadings } = useConfig();
  const { ctx } = useUnsafeSnapshot();

  if (!ctx.walletAddress) {
    return (
      <SkeletonBox
        className={clsx({
          'h-[108px]': hideTokenInputHeadings,
          'h-[165px]': !hideTokenInputHeadings,
        })}
      />
    );
  }

  return (
    <div className="w-full gap-sw-2xl relative flex flex-col">
      <SkeletonBox
        className={clsx({
          'h-[108px]': hideTokenInputHeadings,
          'h-[165px]': !hideTokenInputHeadings,
        })}
      />

      <SkeletonBox className="h-[56px]" />
      <SkeletonBox className="h-[148px]" />
      <SkeletonBox className="h-[56px]" />
    </div>
  );
};
