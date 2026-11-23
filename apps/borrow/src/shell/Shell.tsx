import { AppLayout } from './AppLayout';
import { BorrowTabs } from './BorrowTabs';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { WalletButton } from '../wallet/WalletButton';

/**
 * The root route: header, hero and the Borrow tabs, whose panel is the route,
 * then the footer, which spans the full width outside the page column.
 */
export function Shell() {
  return (
    <>
      <AppLayout>
        <Header walletSlot={<WalletButton />} />
        <main>
          <Hero />
          <BorrowTabs />
        </main>
      </AppLayout>
      <Footer />
    </>
  );
}
