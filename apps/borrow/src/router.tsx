import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useNavigate,
  useSearch,
} from '@tanstack/react-router';
import type { RouterHistory } from '@tanstack/react-router';
import { useTheme } from '@aurora-is-near/ui-kit';
import { lazy } from 'react';

import { NewLoanPage } from './loan/NewLoanPage';
import { PositionsPage } from './positions/PositionsPage';
import { Shell } from './shell/Shell';

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

/** `PositionsPage` driven by the route's `position` search param. */
function PositionsRoute() {
  const { position } = useSearch({ strict: false });
  const navigate = useNavigate();

  return (
    <PositionsPage
      selectedId={position}
      onSelect={(id) => {
        void navigate({
          to: '/positions',
          search: { position: id },
          replace: true,
          resetScroll: false,
        });
      }}
    />
  );
}

/**
 * The My positions tab: the user's loans, or the empty, loading and error
 * states. The `position` search param picks the loan shown; picking another
 * replaces the history entry, so Back leaves the tab rather than stepping
 * through picks.
 */
const positionsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/positions',
  validateSearch: validatePositionsSearch,
  component: PositionsRoute,
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

/**
 * The kit gallery, full page without the shell. Everything about it, the
 * dynamic import included, sits behind `import.meta.env.DEV`, which Vite
 * replaces with a literal, so a production build drops the branch and the
 * gallery chunk is never emitted.
 *
 * The subpath is kit source (TSX), so this app's `tsc` typechecks the kit's
 * source under this app's tsconfig (`noUncheckedIndexedAccess` included), and
 * kit files reachable from it must not use the kit's `@/` path alias, which
 * does not resolve from here.
 */
const createGalleryRoutes = () => {
  if (!import.meta.env.DEV) {
    return [];
  }

  const LazyGallery = lazy(() =>
    import('@aurora-is-near/ui-kit/gallery').then((m) => ({
      default: m.Gallery,
    })),
  );

  // The app's own entries: the borrow dialogs, beside the artboards.
  const LazyBorrowGallery = lazy(() =>
    import('./loan/execution/BorrowDialogGallery').then((m) => ({
      default: m.BorrowDialogGallery,
    })),
  );

  // The My positions states, from fixtures.
  const LazyPositionsGallery = lazy(() =>
    import('./positions/PositionsGallery').then((m) => ({
      default: m.PositionsGallery,
    })),
  );

  // The theme comes from the app's kit copy (`dist`), the one its provider
  // belongs to; the gallery's source copy has its own, empty, context.
  const Gallery = () => (
    <>
      <LazyGallery theme={useTheme()} />
      <LazyBorrowGallery />
      <LazyPositionsGallery />
    </>
  );

  return [
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/gallery',
      component: Gallery,
    }),
  ];
};

const createRouteTree = () =>
  rootRoute.addChildren([
    shellRoute.addChildren([newLoanRoute, positionsRoute]),
    ...createGalleryRoutes(),
    unknownRoute,
  ]);

/**
 * The app's router. Browser history by default; tests pass a memory history.
 * `/gallery` exists only when `import.meta.env.DEV` is true.
 */
export const createAppRouter = (history?: RouterHistory) =>
  createRouter({ routeTree: createRouteTree(), history });

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
