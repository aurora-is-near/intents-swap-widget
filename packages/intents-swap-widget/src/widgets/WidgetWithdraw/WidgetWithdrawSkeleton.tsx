import clsx from 'clsx';

import { SkeletonBox } from '@/components/SkeletonBox';
import { useConfig } from '@/config';

export const WidgetWithdrawSkeleton = () => {
  const { hideTokenInputHeadings } = useConfig();

  return (
    <div className="w-full gap-[10px] relative flex flex-col">
      <div className="gap-[10px] relative flex flex-col">
        <SkeletonBox
          className={clsx({
            'h-[98px]': hideTokenInputHeadings,
            'h-[120px]': !hideTokenInputHeadings,
          })}
        />
        <SkeletonBox
          className={clsx({
            'h-[98px]': hideTokenInputHeadings,
            'h-[120px]': !hideTokenInputHeadings,
          })}
        />
        <SkeletonBox className="h-[152px]" />
      </div>

      <div className="gap-[10px] relative flex flex-col">
        <SkeletonBox className="h-[120px]" />
        <SkeletonBox className="h-[48px]" />
      </div>
    </div>
  );
};
