import clsx from 'clsx';

import { SkeletonBox } from '@/components/SkeletonBox';
import { useConfig } from '@/config';

export const WidgetDepositSkeleton = () => {
  const { hideTokenInputHeadings } = useConfig();

  return (
    <div className="w-full gap-sw-xl relative flex flex-col">
      <SkeletonBox
        className={clsx({
          'h-[108px]': hideTokenInputHeadings,
          'h-[165px]': !hideTokenInputHeadings,
        })}
      />
      <SkeletonBox className="h-[116px]" />

      <div className="gap-sw-lg relative flex flex-col">
        <SkeletonBox className="h-[44px]" />
        <SkeletonBox className="h-[48px]" />
      </div>
    </div>
  );
};
