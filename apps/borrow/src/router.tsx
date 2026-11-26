import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import type { RouterHistory } from '@tanstack/react-router';

import { NewLoanPage } from '@/domains/loan/components/NewLoanPage/NewLoanPage';
import { PositionsEmptyState } from '@/domains/positions/PositionsEmptyState';
import { Shell } from '@/shell/Shell';

const rootRoute = createRootRoute({ component: Outlet });

/** The page chrome: header, hero, tabs and footer around the two tab routes. */
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: Shell,
});

/**
 * The New loan tab: the loan form beside the market list, and the borrow
 * dialogs it opens.
 */
const newLoanRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  component: NewLoanPage,
});

/** The My positions tab: the empty state until positions are read. */
const positionsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/positions',
  component: PositionsEmptyState,
});

/**
 * Any other path goes back to New loan, replacing the unknown entry.
 * `throw: true` makes `redirect` throw its redirect itself (it is not an
 * Error, which a `throw` statement here would have to be).
 */
const unknownRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => {
    redirect({ to: '/', replace: true, throw: true });
  },
});

const createRouteTree = () =>
  rootRoute.addChildren([
    shellRoute.addChildren([newLoanRoute, positionsRoute]),
    unknownRoute,
  ]);

/**
 * The app's router. Browser history by default; tests pass a memory history.
 * The design system and the borrow dialogs are in Storybook (`/storybook`
 * on the deployed site; `yarn workspace @aurora-is-near/ui-kit storybook`).
 */
export const createAppRouter = (history?: RouterHistory) =>
  createRouter({ routeTree: createRouteTree(), history });

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
