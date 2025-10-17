const SkeletonBox = ({ height }: { height: string }) => (
  <div className={`${height} animate-pulse rounded-lg bg-sw-gray-800`} />
);

export const WidgetSkeleton = {
  Swap: () => (
    <div className="gap-sw-lg relative flex flex-col">
      <div className="gap-sw-lg relative flex flex-col">
        <div className="gap-sw-lg relative flex flex-col">
          <SkeletonBox height="h-[72px]" />
          <SkeletonBox height="h-[72px]" />
        </div>
        <SkeletonBox height="h-[48px]" />
      </div>
    </div>
  ),

  Deposit: () => (
    <div className="gap-sw-lg relative flex flex-col">
      <SkeletonBox height="h-[72px]" />
      <SkeletonBox height="h-[48px]" />
    </div>
  ),

  Withdraw: () => (
    <div className="gap-sw-lg relative flex flex-col">
      <SkeletonBox height="h-[120px]" />
      <SkeletonBox height="h-[120px]" />
      <SkeletonBox height="h-[48px]" />
    </div>
  ),
};
