import clsx from 'clsx';

import { SkeletonBox } from '@/components/SkeletonBox';
import { useConfig } from '@/config';

export const WidgetWithdrawSkeleton = () => {
  const { hideTokenInputHeadings } = useConfig();

  return (
    <div className="w-full gap-sw-xl relative flex flex-col">
      <div className="gap-sw-lg relative flex flex-col">
        <SkeletonBox
          className={clsx({
            'h-[108px]': hideTokenInputHeadings,
            'h-[165px]': !hideTokenInputHeadings,
          })}
        />
        <SkeletonBox
          className={clsx({
            'h-[108px]': hideTokenInputHeadings,
            'h-[165px]': !hideTokenInputHeadings,
          })}
        />
        <SkeletonBox className="h-[152px]" />
      </div>

      <div className="gap-sw-lg relative flex flex-col">
        <SkeletonBox className="h-[120px]" />
        <SkeletonBox className="h-[48px]" />
      </div>
    </div>
  );
};
