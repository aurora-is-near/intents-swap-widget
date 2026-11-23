import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import {
  forwardRef,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
} from 'react';

import { cn } from '../lib/cn';

/*
 * No artboard has a tooltip. Built from the existing tokens, as decided in
 * the plan review: an inverted chip, `ink` with `sf` text, so it reads in
 * both themes.
 */

/** Popup: `ink` / `sf`, 13px / 600, radius 10, padding 6px 10px, at most 240px. */
const POPUP =
  'box-border max-w-[240px] rounded-[10px] bg-ink px-[10px] py-[6px] font-sans text-[13px] leading-[1.35] font-semibold text-sf transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none';

export type TooltipProviderProps = TooltipPrimitive.Provider.Props;

/**
 * Shares the open delay across tooltips, so moving between triggers shows
 * the next one at once. Wrap the app (or a toolbar) in it.
 */
export function TooltipProvider(props: TooltipProviderProps) {
  return <TooltipPrimitive.Provider {...props} />;
}

export type TooltipProps = {
  /** The tooltip's text. */
  content: ReactNode;
  /**
   * The trigger: one focusable element, such as a `Button`. It gets the
   * hover and focus handlers and `aria-describedby`.
   */
  children: ReactElement;
  /** Which side of the trigger it opens on. Defaults to `top`. */
  side?: TooltipPrimitive.Positioner.Props['side'];
  /** Distance from the trigger in px. Defaults to 8. */
  sideOffset?: number;
  /** Hover delay in ms before opening. Focus opens at once. */
  delay?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: TooltipPrimitive.Root.Props['onOpenChange'];
  disabled?: boolean;
  className?: string;
};

/**
 * A short hint on Base UI `Tooltip`: opens on hover and keyboard focus,
 * closes on Escape, blur and pointer leave. Portalled to `<body>`; it takes
 * the theme from `data-theme` on `<html>`.
 *
 * Base UI 1.8 renders the popup without a role and leaves the trigger
 * unlinked, so the popup gets `role="tooltip"` and, while it is open, the
 * trigger gets `aria-describedby` pointing at it (never at a missing node).
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      content,
      children,
      side = 'top',
      sideOffset = 8,
      delay,
      open,
      defaultOpen,
      onOpenChange,
      disabled,
      className,
    },
    ref,
  ) => {
    const popupId = useId();
    const [uncontrolledOpen, setUncontrolledOpen] = useState(
      defaultOpen ?? false,
    );

    const isOpen = open ?? uncontrolledOpen;

    return (
      <TooltipPrimitive.Root
        defaultOpen={defaultOpen}
        disabled={disabled}
        onOpenChange={(nextOpen, eventDetails) => {
          setUncontrolledOpen(nextOpen);
          onOpenChange?.(nextOpen, eventDetails);
        }}
        open={open}>
        <TooltipPrimitive.Trigger
          aria-describedby={isOpen ? popupId : undefined}
          delay={delay}
          render={children}
        />
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
            <TooltipPrimitive.Popup
              ref={ref}
              className={cn(POPUP, className)}
              id={popupId}
              role="tooltip">
              {content}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );
  },
);

Tooltip.displayName = 'Tooltip';
