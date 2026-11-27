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
import { SwapPage } from '@/domains/swap/components/SwapPage';
import { BorrowSection } from '@/shell/BorrowSection';
import { Shell } from '@/shell/Shell';

const rootRoute = createRootRoute({ component: Outlet });

/** The page chrome: header and footer around the sections. */
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: Shell,
});

/** The Borrow section: the hero and the tabs around the two tab routes. */
const borrowRoute = createRoute({
  getParentRoute: () => shellRoute,
  id: 'borrow',
  component: BorrowSection,
});

/**
 * The Swap page: the swap widget beside the Swap mode panel. The widget is
 * its own chunk, loaded on the client (`SwapPage`).
 */
const swapRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/swap',
  component: SwapPage,
  staticData: {
    head: {
      title: 'Swap · Aurora Borrow',
      description:
        'Sell any asset, receive any asset. Pick a private or a public route, settled from one signed intent.',
    },
  },
});

/**
 * The New loan tab: the loan form beside the market list, and the borrow
 * dialogs it opens.
 */
const newLoanRoute = createRoute({
  getParentRoute: () => borrowRoute,
  path: '/',
  component: NewLoanPage,
  staticData: {
    head: {
      title: 'One click borrow · Aurora Borrow',
      description:
        'Pick what you supply and what you borrow. Aurora Borrow compares the lending markets and points you to the cheapest one.',
    },
  },
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
  getParentRoute: () => borrowRoute,
  path: '/positions',
  validateSearch: validatePositionsSearch,
  component: PositionsPage,
  // The connected wallet's loans: nothing to index.
  staticData: {
    head: { title: 'My positions · Aurora Borrow', noindex: true },
  },
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
    shellRoute.addChildren([
      borrowRoute.addChildren([newLoanRoute, positionsRoute]),
      swapRoute,
    ]),
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
