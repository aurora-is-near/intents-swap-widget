import { useSyncExternalStore } from 'react';

import { getAaveMarket, marketTitle } from '../aave/markets';
import { usePageState } from '../page/usePageState';
import { type SupplyDestination, SupplyModal } from '../ui/SupplyModal';

const listeners = new Set<() => void>();
let isOpen = false;

const setOpen = (open: boolean) => {
  isOpen = open;
  listeners.forEach((listener) => listener());
};

/** Opened by the page's button, closed by the modal. */
export const modal = {
  open: () => setOpen(true),
  close: () => setOpen(false),
  subscribe: (listener: () => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
  get: () => isOpen,
};

const UNSUPPORTED_HINT =
  'Switch Aave to Core, Prime, Base, Arbitrum, OP, Polygon, Avalanche, BNB Chain, Gnosis, Plasma, Monad or X Layer.';

/**
 * The integration: reads what app.aave.com shows and hands it to the modal,
 * as a dApp would pass its own state to the UI package.
 */
export const App = () => {
  const open = useSyncExternalStore(modal.subscribe, modal.get);
  const { account, market } = usePageState(open);
  const aaveMarket = getAaveMarket(market);

  const destination: SupplyDestination = aaveMarket
    ? { title: `Aave ${marketTitle(aaveMarket)}`, supported: true }
    : { title: 'Aave', supported: false, hint: UNSUPPORTED_HINT };

  return (
    <SupplyModal
      open={open}
      onClose={modal.close}
      positionOwner={account?.address ?? null}
      destination={destination}
    />
  );
};
