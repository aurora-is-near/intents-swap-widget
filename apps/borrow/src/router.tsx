import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import type { RouterHistory } from '@tanstack/react-router';

import { NewLoanPlaceholder } from './loan/NewLoanPlaceholder';
import { PositionsEmptyState } from './positions/PositionsEmptyState';
import { Shell } from './shell/Shell';

const rootRoute = createRootRoute({ component: Shell });

/** The New loan tab: a placeholder until the loan form feature. */
const newLoanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: NewLoanPlaceholder,
});

/** The My positions tab: the empty state until positions are read. */
const positionsRoute = createRoute({
  getParentRoute: () => rootRoute,
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

const routeTree = rootRoute.addChildren([
  newLoanRoute,
  positionsRoute,
  unknownRoute,
]);

/**
 * The app's router. Browser history by default; tests pass a memory history.
 */
export const createAppRouter = (history?: RouterHistory) =>
  createRouter({ routeTree, history });

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
