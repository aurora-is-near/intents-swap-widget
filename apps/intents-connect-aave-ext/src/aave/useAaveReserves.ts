import { useEffect, useState } from 'react';

import type { AaveMarket } from './markets';
import { type AaveReserve, fetchAaveReserves } from './reserves';

/** Reserves move slowly; a minute-old read is good enough for a form. */
const MAX_AGE_MS = 60_000;

const cache = new Map<
  string,
  { at: number; reserves: Promise<AaveReserve[]> }
>();

const load = (market: AaveMarket, rpcUrl: string) => {
  const cached = cache.get(market.name);

  if (cached && Date.now() - cached.at < MAX_AGE_MS) {
    return cached.reserves;
  }

  const reserves = fetchAaveReserves(market, rpcUrl);

  cache.set(market.name, { at: Date.now(), reserves });
  // A failed read is retried on the next opening, not served from cache.
  reserves.catch(() => cache.delete(market.name));

  return reserves;
};

type State = { market: string; reserves?: AaveReserve[]; error?: Error };

/**
 * The reserves of `market`, read while `active` (the modal is open).
 * `reserves` is undefined while loading or after an `error`.
 */
export const useAaveReserves = (
  market: AaveMarket | undefined,
  rpcUrl: (chain: AaveMarket['chain']) => string,
  active: boolean,
): { reserves?: AaveReserve[]; error?: Error } => {
  const [state, setState] = useState<State>();

  useEffect(() => {
    if (!market || !active) {
      return undefined;
    }

    let live = true;

    load(market, rpcUrl(market.chain)).then(
      (reserves) => {
        if (live) {
          setState({ market: market.name, reserves });
        }
      },
      (error: unknown) => {
        if (live) {
          setState({
            market: market.name,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    );

    return () => {
      live = false;
    };
  }, [market, rpcUrl, active]);

  return state && state.market === market?.name ? state : {};
};
