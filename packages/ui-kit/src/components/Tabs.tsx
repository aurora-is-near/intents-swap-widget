import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { forwardRef } from 'react';

import { cn } from '../lib/cn';
import { FOCUS_RING } from '../lib/focusRing';
import { SEG_CLASSES } from '../lib/segClasses';

/**
 * The tab row (Web-Borrow.dc.html line 208): flex, gap 8px. A vertical
 * `orientation` (Base UI's `data-orientation`) stacks the tabs, so the
 * layout matches the arrow keys.
 */
const LIST = 'flex gap-[8px] data-[orientation=vertical]:flex-col';

/**
 * A tab is the `.seg` pill (lines 136–138): inline-flex, gap 8px, 15px /
 * 700. Selected (Base UI's `data-active`) is ink with `sf` text; disabled
 * is opacity .45 (line 102, used on line 902). The line-height is the
 * browser's button `normal`, after the font size (see Button). Focus ring
 * as on line 20.
 *
 * Pressed: the artboard has no pressed look, and Base UI selects on click,
 * so an enabled, unselected tab (neither `data-active` nor
 * `data-disabled`, which Base UI sets whether or not the button is natively
 * disabled) takes the kit's `hov` fill (`.row:hover`,
 * `.ibtn:hover`, lines 30 and 54) while it is held. Selected and disabled
 * tabs keep their look.
 */
const TAB = cn(
  `box-border inline-flex cursor-pointer items-center gap-[8px] font-sans font-bold ${FOCUS_RING}`,
  SEG_CLASSES,
  'leading-[normal] active:not-data-active:not-data-disabled:bg-hov data-active:border-ink data-active:bg-ink data-active:text-sf data-disabled:cursor-not-allowed data-disabled:opacity-45',
);

/**
 * The count badge (line 210): `#C9EB8A` (the `accent` token's value) with
 * `onlime` text, radius 999, padding 0 8px, 13px.
 */
const COUNT = 'rounded-full bg-accent px-[8px] text-[13px] text-onlime';

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
 * The `tablist`. Arrow keys move between tabs, Home and End to the ends;
 * name it with `aria-label`.
 */
export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List ref={ref} className={cn(LIST, className)} {...props} />
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

/** One `.seg` pill tab (role `tab`). */
export const Tab = forwardRef<HTMLElement, TabProps>(
  ({ count, className, children, ...props }, ref) => (
    <TabsPrimitive.Tab ref={ref} className={cn(TAB, className)} {...props}>
      {children}
      {count != null && (
        <>
          {/* Separates the count in the accessible name; a flex container
              does not render whitespace between items. */}{' '}
          <span className={COUNT} data-slot="count">
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
