import { cn } from '@aurora-is-near/intents-swap-widget/utils';

/**
 * A pulsing placeholder sized entirely by `className` (width, height, radius).
 * The widget's own `Skeleton` builds its height class at runtime, which
 * Tailwind never generates, and pins a fixed pixel width.
 */
export const SkeletonBlock = ({ className }: { className?: string }) => (
  // A span, so it can also sit inline inside text rows.
  <span
    aria-hidden
    className={cn(
      'block animate-pulse rounded-sw-sm bg-sw-gray-800',
      className,
    )}
  />
);
