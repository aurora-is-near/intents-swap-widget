import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn';
import { AlertIcon, ClockIcon } from '../icons/icons';

/*
 * The modal's error and warning blocks (Web-Borrow.dc.html lines 985–994)
 * and the position's "close to liquidation" block (line 409). All three are
 * the same block; line 409 only swaps `sf2` for `negbg` and adds actions
 * under the text, which `tinted` and the children cover.
 */

/*
 * Spacing is in rem (Tailwind's grid); text sizes (the kit's px scale),
 * borders, radii and the 24px icons are in px.
 */

/**
 * The icon circles are literal hex on the artboards, the same in both
 * themes: `#A8321F` (the light theme's `--neg`) and `#B27A00`, which has no
 * token. Their white glyphs stay white in dark too (the artboard's theme
 * rule would repaint them `--sf`, which is 2.7:1 on `#A8321F`; white is
 * 6.4:1).
 */
const TONES = {
  danger: {
    role: 'alert',
    /** Line 985: `background:var(--sf2); border-color:var(--neg)`. */
    box: 'bg-sf2 border-neg',
    /** Line 409: `background:var(--negbg)`. */
    tinted: 'bg-negbg border-neg',
    title: 'text-neg',
    // Lines 986 and 992: `flex:0 0 auto; margin-top:1px`.
    icon: <AlertIcon className="mt-px shrink-0" color="#A8321F" />,
  },
  warning: {
    role: 'status',
    /** Line 991: `background:var(--warnbg); border-color:var(--warnbd)`. */
    box: 'bg-warnbg border-warnbd',
    tinted: 'bg-warnbg border-warnbd',
    title: 'text-warn',
    icon: <ClockIcon className="mt-px shrink-0" color="#B27A00" />,
  },
} as const;

export type BannerTone = keyof typeof TONES;

export type BannerProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'title' | 'role'
> & {
  /** `danger` is announced at once (`alert`); `warning` politely (`status`). */
  tone: BannerTone;
  title: ReactNode;
  /**
   * The danger block on the `negbg` tint, as on the position screen
   * (line 409), instead of `sf2` (line 985). No effect on `warning`.
   */
  tinted?: boolean;
  /** The explanation, and any actions under it. */
  children?: ReactNode;
};

/** An inline error or warning block with an icon, a title and text. */
export const Banner = forwardRef<HTMLDivElement, BannerProps>(
  ({ tone, title, tinted = false, className, children, ...props }, ref) => {
    const styles = TONES[tone];

    return (
      <div
        ref={ref}
        className={cn(
          'box-border flex items-start gap-3 rounded-18 border-1.5 border-solid px-4 py-3.5 font-sans text-ink',
          tinted ? styles.tinted : styles.box,
          className,
        )}
        role={styles.role}
        {...props}>
        {styles.icon}
        {/* Line 409: `min-width:0; flex:1`, so actions in the children can
            wrap. */}
        <div className="min-w-0 flex-1">
          <div className={cn('text-16 leading-font font-bold', styles.title)}>
            {title}
          </div>
          {children != null ? (
            <div className="mt-1 text-14 leading-1.45 text-mut">{children}</div>
          ) : null}
        </div>
      </div>
    );
  },
);

Banner.displayName = 'Banner';
