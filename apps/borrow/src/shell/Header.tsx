import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

/**
 * The selected `.nv` pill (Web-Borrow-NotConnected.dc.html lines 17–19):
 * padding 10px 20px, radius 12, 16px / 700, ink with `sf` text. The
 * line-height is the browser's button `normal`, as on the artboard's
 * buttons. At ≤640px the pills share the row, padding 10px 8px (line 111).
 */
const NAV_PILL =
  'box-border inline-block rounded-[12px] bg-ink px-[20px] py-[10px] text-center text-[16px] font-bold leading-[normal] text-sf no-underline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid mobile:flex-1 mobile:px-[8px]';

type HeaderProps = {
  /** The wallet button, after the theme toggle. */
  walletSlot?: ReactNode;
};

/**
 * The top bar (line 183): logo and section nav on the left, theme toggle and
 * wallet on the right. At ≤640px (lines 103–113) the logo and the right
 * group share the first row and the nav takes a full row below.
 *
 * Only the Borrow section is shown (decided: no Swap, Earn, Docs or X).
 */
export function Header({ walletSlot }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-[16px] py-[20px] mobile:gap-[12px] mobile:pt-[14px] mobile:pb-[12px]">
      <div className="flex flex-wrap items-center gap-[32px] mobile:contents">
        <div className="mobile:order-1">
          <Logo />
        </div>
        <nav
          aria-label="Sections"
          className="flex gap-[4px] rounded-[16px] bg-sf2 p-[4px] mobile:order-3 mobile:box-border mobile:w-full">
          <Link activeOptions={{ exact: false }} className={NAV_PILL} to="/">
            Borrow
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-[6px] mobile:order-2 mobile:ml-auto">
        <ThemeToggle />
        {walletSlot}
      </div>
    </header>
  );
}
