import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import type { RouterHistory } from '@tanstack/react-router';
import { useTheme } from '@aurora-is-near/ui-kit';
import { lazy } from 'react';

import { NewLoanPlaceholder } from './loan/NewLoanPlaceholder';
import { PositionsEmptyState } from './positions/PositionsEmptyState';
import { Shell } from './shell/Shell';

const rootRoute = createRootRoute({ component: Outlet });

/** The page chrome: header, hero, tabs and footer around the two tab routes. */
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: Shell,
});

/** The New loan tab: a placeholder until the loan form feature. */
const newLoanRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  component: NewLoanPlaceholder,
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

/**
 * The kit gallery, full page without the shell. Everything about it, the
 * dynamic import included, sits behind `import.meta.env.DEV`, which Vite
 * replaces with a literal, so a production build drops the branch and the
 * gallery chunk is never emitted.
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

  // The theme comes from the app's kit copy (`dist`), the one its provider
  // belongs to; the gallery's source copy has its own, empty, context.
  const Gallery = () => <LazyGallery theme={useTheme()} />;

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
