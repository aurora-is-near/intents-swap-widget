import { Outlet } from '@tanstack/react-router';

import { AppLayout } from './AppLayout';
import { Footer } from './Footer';
import { Header } from './Header';

/**
 * The shell layout route around the sections: header and the section's
 * route, then the footer, which spans the full width outside the page column.
 */
export function Shell() {
  return (
    <>
      <AppLayout>
        <Header />
        <main>
          <Outlet />
        </main>
      </AppLayout>
      <Footer />
    </>
  );
}
