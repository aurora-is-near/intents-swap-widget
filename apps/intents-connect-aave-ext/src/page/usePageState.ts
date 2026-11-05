import { useEffect, useState } from 'react';

import { type AaveAccount, readAaveAccount, readAaveMarket } from './aave';

type PageState = {
  account: AaveAccount | null;
  market: string;
};

const read = (): PageState => ({
  account: readAaveAccount(),
  market: readAaveMarket(),
});

const sameState = (a: PageState, b: PageState) =>
  a.market === b.market &&
  a.account?.address === b.account?.address &&
  a.account?.chainId === b.account?.chainId;

/**
 * The Aave account and market, re-read every second while `active`: the
 * page changes both without telling anyone (wagmi writes its store, Next
 * swaps the URL), and a second is plenty for a modal on top of it.
 */
export const usePageState = (active: boolean): PageState => {
  const [state, setState] = useState(read);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const update = () =>
      setState((previous) => {
        const next = read();

        return sameState(previous, next) ? previous : next;
      });

    update();

    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [active]);

  return state;
};
