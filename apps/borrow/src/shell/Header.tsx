import { cn } from '@aurora-is-near/ui-kit';
import { Link, useMatchRoute } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, Ref } from 'react';

import { WalletButton } from '@/domains/wallet/components/WalletButton/WalletButton';

import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { XIcon } from './XIcon';

// The pill is measured before paint in the browser; the build-time
// prerender (src/prerender.tsx) renders it unplaced, as the first client
// render does, and would warn about a layout effect on the server.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * One `.nv` section pill (Web-Borrow-NotConnected.dc.html lines 17–19):
 * padding 10px 20px, radius 12, 16px / 700, `mut` on hover `hov`; the
 * selected one `sf` text over the sliding ink pill. The line-height is the
 * browser's button `normal`, as on the artboard's buttons. At ≤640px the
 * pills share the row, padding 10px 8px (line 111).
 */
function SectionLink({
  to,
  active,
  pillRef,
  children,
}: {
  to: '/' | '/swap';
  active: boolean;
  /** Takes the active link, which the sliding pill is measured from. */
  pillRef: Ref<HTMLAnchorElement>;
  children: string;
}) {
  return (
    <Link
      ref={active ? pillRef : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative z-1 box-border inline-block rounded-12 px-5 py-2.5 text-center text-16 font-bold leading-font no-underline transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid mobile:flex-1 mobile:px-2',
        active ? 'text-sf' : 'text-mut hover:bg-hov',
      )}
      to={to}>
      {children}
    </Link>
  );
}

/**
 * The selected section's ink pill, measured from the active link so it
 * slides to the other one on a switch. It does not animate into its first
 * place, and follows the link when its size changes (fonts, mobile row).
 * Reduced motion jumps instead of sliding.
 */
function useActivePill(onSwap: boolean) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [style, setStyle] = useState<CSSProperties>();
  const [placed, setPlaced] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const link = linkRef.current;

    if (!link) {
      return undefined;
    }

    const place = () =>
      setStyle({
        width: link.offsetWidth,
        height: link.offsetHeight,
        transform: `translate(${link.offsetLeft}px, ${link.offsetTop}px)`,
      });

    place();

    // Absent in jsdom.
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(place);

    observer.observe(link);

    return () => observer.disconnect();
  }, [onSwap]);

  useIsomorphicLayoutEffect(() => {
    if (style && !placed) {
      // Turn the transition on only after the first placement has painted.
      const frame = requestAnimationFrame(() => setPlaced(true));

      return () => cancelAnimationFrame(frame);
    }

    return undefined;
  }, [style, placed]);

  return { linkRef, style, placed };
}

/**
 * The top bar (line 183): logo and section nav on the left; Docs, X, theme
 * toggle and wallet on the right. At ≤640px (lines 103–113) the logo and the
 * right group share the first row, the nav takes a full row below, and Docs
 * and X are hidden.
 *
 * Swap and Borrow are shown (no Earn). Docs and X have no URLs yet, so they
 * are text and an icon, not links.
 */
export function Header() {
  const matchRoute = useMatchRoute();
  const onSwap = Boolean(matchRoute({ to: '/swap' }));
  const pill = useActivePill(onSwap);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-5 mobile:gap-3 mobile:pt-3.5 mobile:pb-3">
      <div className="flex flex-wrap items-center gap-8 mobile:contents">
        <div className="mobile:order-1">
          <Logo />
        </div>
        <nav
          aria-label="Sections"
          className="relative flex gap-1 rounded-16 bg-sf2 p-1 mobile:order-3 mobile:box-border mobile:w-full">
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-0 left-0 rounded-12 bg-ink',
              pill.placed &&
                'motion-safe:transition-[transform,width] motion-safe:duration-300 motion-safe:ease-out',
              !pill.style && 'hidden',
            )}
            style={pill.style}
          />
          <SectionLink active={onSwap} pillRef={pill.linkRef} to="/swap">
            Swap
          </SectionLink>
          <SectionLink active={!onSwap} pillRef={pill.linkRef} to="/">
            Borrow
          </SectionLink>
        </nav>
      </div>
      <div className="flex items-center gap-1.5 mobile:order-2 mobile:ml-auto">
        {/* `.nv hide-m` (line 190). Text until Docs has a URL. */}
        <span className="box-border inline-block rounded-12 px-5 py-2.5 text-16 font-bold leading-font text-mut mobile:hidden">
          Docs
        </span>
        {/* `.ibtn hide-m`, 40×40 (lines 53–54, 190). An icon until X has a URL. */}
        <span
          aria-label="X"
          className="flex h-10 w-10 items-center justify-center rounded-12 mobile:hidden"
          role="img">
          <XIcon className="fill-ink" />
        </span>
        <ThemeToggle />
        <WalletButton />
      </div>
    </header>
  );
}
