import type { ReactNode } from 'react';

type AppLayoutProps = {
  children?: ReactNode;
};

/**
 * The page column, `.wrap` (Web-Borrow-NotConnected.dc.html line 100):
 * max-width 1200, centred, padding `0 24px 56px`; `0 16px 40px` at ≤640px
 * (line 108).
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="mx-auto box-border max-w-[1200px] px-[24px] pb-[56px] mobile:px-[16px] mobile:pb-[40px]">
      {children}
    </div>
  );
}
