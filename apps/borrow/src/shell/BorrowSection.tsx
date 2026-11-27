import { BorrowTabs } from './BorrowTabs';
import { Hero } from './Hero';

/** The Borrow section's layout route: the hero and the Borrow tabs. */
export function BorrowSection() {
  return (
    <>
      <Hero />
      <BorrowTabs />
    </>
  );
}
