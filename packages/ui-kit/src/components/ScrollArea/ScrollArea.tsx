import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export type ScrollAreaProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Classes for the scrolling element: its height cap (such as `max-h-59`),
   * its padding, its radius.
   */
  viewportClassName?: string;
  /**
   * Classes that place the scrollbar, such as `-mr-2.5 my-1` to move it out
   * into the host's padding so it never covers the content. It sits against
   * the right edge of the area by default.
   */
  scrollbarClassName?: string;
};

/**
 * A vertical scroll area on Base UI `ScrollArea`: the browser's scrollbar is
 * hidden and the kit draws a 3px one that appears only while the content is
 * scrolling, then fades out. While hidden it lets clicks through. The
 * scrolling element keeps native touch and wheel scrolling, stops at its ends
 * (`overscroll-contain`) and is focusable for keyboard scrolling.
 *
 * `className` and the other props go on the root; `children` scroll inside.
 * It scrolls only vertically, so it does not use Base UI's
 * `ScrollArea.Content`: that sizes to its widest child (`min-width:
 * fit-content`) for sideways scrolling, which would stretch rows past the
 * area and stop their text truncating.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    { className, viewportClassName, scrollbarClassName, children, ...props },
    ref,
  ) => (
    <ScrollAreaPrimitive.Root
      ref={ref}
      className={cn('relative', className)}
      {...props}>
      <ScrollAreaPrimitive.Viewport
        className={cn(
          'overscroll-contain focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid',
          viewportClassName,
        )}>
        {children}
      </ScrollAreaPrimitive.Viewport>
      {/*
        Fades in over 100ms when scrolling starts and out over 300ms after it
        stops (Base UI's `data-scrolling`), on the kit's `ease-out`.
      */}
      <ScrollAreaPrimitive.Scrollbar
        className={cn(
          'pointer-events-none flex w-0.75 justify-center opacity-0 transition-opacity duration-300 ease-out data-scrolling:pointer-events-auto data-scrolling:opacity-100 data-scrolling:duration-100',
          scrollbarClassName,
        )}>
        <ScrollAreaPrimitive.Thumb className="w-full rounded-full bg-mid" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  ),
);

ScrollArea.displayName = 'ScrollArea';
