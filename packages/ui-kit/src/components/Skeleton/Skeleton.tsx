import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export type SkeletonProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children'
> & {
  /** CSS width; a number is px. Defaults to the container's width. */
  width?: CSSProperties['width'];
  /** CSS height; a number is px. Defaults to 16px. */
  height?: CSSProperties['height'];
  /** Corner radius in px; half the size for a circle. Defaults to 8. */
  radius?: number;
};

/**
 * A placeholder block shown while content loads. Hidden from assistive
 * technology: announce loading on the region it stands in for instead (for
 * example `aria-busy` on that region).
 *
 * No artboard has a skeleton: it is the `--track` fill (the slider track's
 * colour) with Tailwind's pulse, which stops under `prefers-reduced-motion`.
 */
export const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(
  ({ width, height = 16, radius = 8, className, style, ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(
        'block bg-track animate-pulse motion-reduce:animate-none',
        className,
      )}
      style={{ width, height, borderRadius: radius, ...style }}
      {...props}
    />
  ),
);

Skeleton.displayName = 'Skeleton';
