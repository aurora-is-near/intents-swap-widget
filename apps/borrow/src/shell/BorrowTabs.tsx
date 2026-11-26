import { Tab, Tabs, TabsList, TabsPanel } from '@aurora-is-near/ui-kit';
import { Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useRef } from 'react';

import { TabFocusContext } from './tabFocus';

/** The paths the Borrow tabs stand for. */
type TabPath = '/' | '/positions';

/** Each tab's value is its route's path. */
const TAB_PATHS: readonly TabPath[] = ['/', '/positions'];

const isTabPath = (value: unknown): value is TabPath =>
  TAB_PATHS.includes(value as TabPath);

/**
 * New loan and My positions (Web-Borrow-NotConnected.dc.html line 208), the
 * kit's `Tabs` driven by the route: the URL selects the tab, and choosing a
 * tab navigates. The row has gap 8 (the kit's) and margin-bottom 20. The
 * selected tab's panel renders the matched route.
 */
export function BorrowTabs() {
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();

  const newLoanTab = useRef<HTMLElement>(null);

  const focusNewLoan = useCallback(() => {
    newLoanTab.current?.focus();
  }, []);

  const value: TabPath = matchRoute({ to: '/positions' }) ? '/positions' : '/';

  const onValueChange = (next: unknown) => {
    if (isTabPath(next) && next !== value) {
      // The tabs switch in place: keep the scroll position instead of the
      // router's default jump to the top.
      void navigate({ to: next, resetScroll: false });
    }
  };

  return (
    <TabFocusContext.Provider value={focusNewLoan}>
      <Tabs onValueChange={onValueChange} value={value}>
        <TabsList aria-label="Borrow views" className="mb-5">
          <Tab ref={newLoanTab} value="/">
            New loan
          </Tab>
          <Tab value="/positions">My positions</Tab>
        </TabsList>
        <TabsPanel value="/">
          <Outlet />
        </TabsPanel>
        <TabsPanel value="/positions">
          <Outlet />
        </TabsPanel>
      </Tabs>
    </TabFocusContext.Provider>
  );
}
