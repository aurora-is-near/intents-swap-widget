import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { forwardRef } from 'react';

import { cn } from '../../utils/cn';

export type TabsProps = TabsPrimitive.Root.Props;

/**
 * Groups a `TabsList` and its `TabsPanel`s, on Base UI's `Tabs`. Pass
 * `value`/`onValueChange` to control it, or `defaultValue`.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>((props, ref) => (
  <TabsPrimitive.Root ref={ref} {...props} />
));

Tabs.displayName = 'Tabs';

export type TabsListProps = Omit<TabsPrimitive.List.Props, 'className'> & {
  className?: string;
};

/**
 * The `tablist` (Web-Borrow.dc.html line 208: flex, gap 8px). Arrow keys
 * move between tabs, Home and End to the ends; name it with `aria-label`.
 */
export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn('flex gap-2', className)}
      {...props}
    />
  ),
);

TabsList.displayName = 'TabsList';

export type TabProps = Omit<TabsPrimitive.Tab.Props, 'className'> & {
  /**
   * A count shown in a badge after the label, such as open positions. Part
   * of the tab's accessible name. Hidden when undefined.
   */
  count?: number;
  className?: string;
};

/**
 * One `.seg` pill tab (role `tab`; lines 136–138): inline-flex, gap 8px,
 * 15px / 700. Selected (Base UI's `data-active`) is ink with `sf` text;
 * disabled is opacity .45 (line 102, used on line 902).
 */
export const Tab = forwardRef<HTMLElement, TabProps>(
  ({ count, className, children, ...props }, ref) => (
    <TabsPrimitive.Tab
      ref={ref}
      className={cn(
        'box-border inline-flex cursor-pointer items-center gap-2 font-sans font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid',
        'rounded-full border-1.5 border-solid border-bd2 bg-sf px-4.5 py-2.25 text-15 text-ink enabled:hover:border-ink',
        // Presses like `Button`'s secondary, on pointer-down. Base UI marks a
        // disabled tab with `data-disabled` (it stays focusable, so not
        // `:disabled`); the selected tab ignores clicks, so neither presses.
        // Reduced motion keeps only the colour states.
        'transition-transform duration-160 ease-out motion-safe:not-data-disabled:not-data-active:active:scale-97',
        'leading-font data-active:border-ink data-active:bg-ink data-active:text-sf data-disabled:cursor-not-allowed data-disabled:opacity-45',
        className,
      )}
      {...props}>
      {children}
      {count != null && (
        <>
          {/* Separates the count in the accessible name; a flex container
              does not render whitespace between items. */}{' '}
          {/* The count badge (line 210): `accent` with `onlime` text, a
              20px circle that widens into a pill past one digit. */}
          <span
            className="box-border inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-13 leading-none text-onlime"
            data-slot="count">
            {count}
          </span>
        </>
      )}
    </TabsPrimitive.Tab>
  ),
);

Tab.displayName = 'Tab';

export type TabsPanelProps = Omit<TabsPrimitive.Panel.Props, 'className'> & {
  className?: string;
};

/** The `tabpanel` for the tab with the same `value`. */
export const TabsPanel = forwardRef<HTMLDivElement, TabsPanelProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Panel ref={ref} className={className} {...props} />
  ),
);

TabsPanel.displayName = 'TabsPanel';
