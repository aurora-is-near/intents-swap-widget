/**
 * What a page puts in `<head>`. Each route carries its own as
 * `staticData.head` (`router.tsx`); the build-time prerender writes it into
 * the page's HTML (`vite-plugins/prerender.ts`) and the browser sets the title
 * from it on navigation (`main.tsx`).
 */
export type PageHead = {
  title: string;
  description?: string;
  /** Kept out of search: the page has nothing to index yet, or needs a wallet. */
  noindex?: boolean;
};

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    head?: PageHead;
  }
}

/** For a path no route matches; the build writes it into `404.html`. */
export const NOT_FOUND_HEAD: PageHead = {
  title: 'Page not found · Aurora Borrow',
  noindex: true,
};

/** The deepest matched route's head, or the not-found one. */
export const headOf = (
  matches: ReadonlyArray<{ staticData?: { head?: PageHead } }>,
): PageHead =>
  matches.findLast((match) => match.staticData?.head)?.staticData?.head ??
  NOT_FOUND_HEAD;
