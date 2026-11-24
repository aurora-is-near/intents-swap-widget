import { AppLayout } from './AppLayout';
import { BorrowTabs } from './BorrowTabs';
import { Header } from './Header';
import { Hero } from './Hero';

/** The root route: header, hero and the Borrow tabs, whose panel is the route. */
export function Shell() {
  return (
    <AppLayout>
      <Header />
      <main>
        <Hero />
        <BorrowTabs />
      </main>
    </AppLayout>
  );
}
