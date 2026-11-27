import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import type { RouterHistory } from '@tanstack/react-router';

import { NewLoanPage } from '@/domains/loan/components/NewLoanPage/NewLoanPage';
import { PositionsPage } from '@/domains/positions/components/PositionsPage/PositionsPage';
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

/** `/positions?position=<id>`: the loan shown, by its `LoanPosition` id. */
export type PositionsSearch = { position?: string };

const validatePositionsSearch = (
  search: Record<string, unknown>,
): PositionsSearch =>
  typeof search.position === 'string' && search.position !== ''
    ? { position: search.position }
    : {};

/**
 * The My positions tab: the user's loans, or the empty, loading and error
 * states. The `position` search param picks the loan shown.
 */
const positionsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/positions',
  validateSearch: validatePositionsSearch,
  component: PositionsPage,
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
