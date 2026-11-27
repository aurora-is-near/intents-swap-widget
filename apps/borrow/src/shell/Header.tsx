import { Link } from '@tanstack/react-router';

import { WalletButton } from '@/domains/wallet/components/WalletButton/WalletButton';

import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

/**
 * The top bar (line 183): logo and section nav on the left, theme toggle and
 * wallet on the right. At ≤640px (lines 103–113) the logo and the right
 * group share the first row and the nav takes a full row below.
 *
 * Only the Borrow section is shown (decided: no Swap, Earn, Docs or X).
 */
export function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-5 mobile:gap-3 mobile:pt-3.5 mobile:pb-3">
      <div className="flex flex-wrap items-center gap-8 mobile:contents">
        <div className="mobile:order-1">
          <Logo />
        </div>
        <nav
          aria-label="Sections"
          className="flex gap-1 rounded-16 bg-sf2 p-1 mobile:order-3 mobile:box-border mobile:w-full">
          {/* The selected `.nv` pill (Web-Borrow-NotConnected.dc.html lines
              17–19): padding 10px 20px, radius 12, 16px / 700, ink with `sf`
              text. The line-height is the browser's button `normal`, as on
              the artboard's buttons. At ≤640px the pills share the row,
              padding 10px 8px (line 111). */}
          <Link
            activeOptions={{ exact: false }}
            className="box-border inline-block rounded-12 bg-ink px-5 py-2.5 text-center text-16 font-bold leading-font text-sf no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid mobile:flex-1 mobile:px-2"
            to="/">
            Borrow
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-1.5 mobile:order-2 mobile:ml-auto">
        <ThemeToggle />
        <WalletButton />
      </div>
    </header>
  );
}
