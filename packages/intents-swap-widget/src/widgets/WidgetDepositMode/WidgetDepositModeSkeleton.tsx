import clsx from 'clsx';

import { SkeletonBox } from '@/components/SkeletonBox';
import { useConfig } from '@/config';

export const WidgetDepositModeSkeleton = () => {
  const { hideTokenInputHeadings } = useConfig();

  return (
    <div className="w-full gap-[10px] relative flex flex-col px-sw-lg pb-sw-lg pt-[42px] rounded-sw-lg bg-sw-gray-900/33">
      <SkeletonBox className="h-[48px]" />
      <SkeletonBox
        className={clsx({
          'h-[98px]': hideTokenInputHeadings,
          'h-[120px]': !hideTokenInputHeadings,
        })}
      />
      <SkeletonBox className="h-[40px]" />
      <SkeletonBox className="w-full h-[56px]" />
    </div>
  );
};
