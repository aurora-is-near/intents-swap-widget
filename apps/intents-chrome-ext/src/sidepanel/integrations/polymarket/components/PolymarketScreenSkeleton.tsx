import { Card } from '@aurora-is-near/intents-swap-widget';

import { SkeletonBlock } from '../../../components/SkeletonBlock';

const Row = () => (
  <div className="flex items-center justify-between gap-sw-md">
    <SkeletonBlock className="h-sw-xl w-sw-10xl" />
    <SkeletonBlock className="h-sw-xl w-sw-max" />
  </div>
);

/** Mirrors the loaded Polymarket screen so nothing jumps when data lands. */
export const PolymarketScreenSkeleton = () => (
  <div className="flex flex-col gap-sw-lg" aria-busy>
    {/* Wallets: EVM + Solana */}
    <Card className="flex flex-col gap-sw-xl">
      {[0, 1].map((section) => (
        <div key={section} className="flex flex-col gap-sw-lg">
          <Row />
          <div className="flex items-center gap-sw-md">
            <SkeletonBlock className="w-sw-3xl h-sw-3xl rounded-sw-sm" />
            <SkeletonBlock className="h-sw-xl w-sw-10xl" />
          </div>
          <Row />
        </div>
      ))}
    </Card>

    {/* Polymarket account */}
    <Card className="flex flex-col gap-sw-lg">
      <div className="flex items-center justify-between gap-sw-md">
        <SkeletonBlock className="h-sw-xl w-1/2" />
        <SkeletonBlock className="h-sw-4xl w-sw-7xl rounded-sw-md" />
      </div>
      <Row />
      <Row />
    </Card>

    {/* Intents Connect account */}
    <Card className="flex flex-col gap-sw-lg">
      <div className="flex flex-col gap-sw-sm">
        <SkeletonBlock className="h-sw-xl w-1/2" />
        <SkeletonBlock className="h-sw-lg w-full" />
      </div>
      <Row />
      <Row />
      <Row />
    </Card>

    {/* Token input */}
    <SkeletonBlock className="h-[120px] w-full rounded-sw-lg" />

    {/* Deposit mode + submit */}
    <div className="flex items-center justify-between gap-sw-lg">
      <div className="flex flex-col gap-sw-sm grow">
        <SkeletonBlock className="h-sw-xl w-3/5" />
        <SkeletonBlock className="h-sw-lg w-4/5" />
      </div>
      <SkeletonBlock className="h-sw-2xl w-sw-5xl rounded-full" />
    </div>
    <SkeletonBlock className="h-[56px] w-full rounded-sw-lg" />
  </div>
);
