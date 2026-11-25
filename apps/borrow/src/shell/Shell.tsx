import { AppLayout } from './AppLayout';
import { BorrowTabs } from './BorrowTabs';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { usePositionsCount } from '../positions/usePositionsCount';
import { WalletButton } from '../wallet/WalletButton';

/**
 * The shell layout route around the two tab routes: header, hero and the Borrow
 * tabs, whose panel is the route, then the footer, which spans the full width
 * outside the page column. The My positions badge counts the wallet's
 * positions, keeping the last known count while a read fails.
 */
export function Shell() {
  const positionsCount = usePositionsCount();

  return (
    <>
      <AppLayout>
        <Header walletSlot={<WalletButton />} />
        <main>
          <Hero />
          <BorrowTabs positionsCount={positionsCount} />
        </main>
      </AppLayout>
      <Footer />
    </>
  );
}
