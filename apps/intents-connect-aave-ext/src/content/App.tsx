import { useMemo, useSyncExternalStore } from 'react';

import { getAaveMarket, marketTitle } from '../aave/markets';
import { buildAaveSupplyPlan } from '../aave/recipe';
import { useAaveReserves } from '../aave/useAaveReserves';
import {
  ALCHEMY_API_KEY,
  connectorOptions,
  evmRpcUrl,
  intentsApi,
  intentsConnectApi,
  tonConnect,
  walletConnect,
  walletSources,
} from '../config';
import { AAVE_THEME } from '../page/aave';
import { usePageState } from '../page/usePageState';
import { SupplyModal } from '../ui/SupplyModal';
import type { SupplyDestination, SupplyOption } from '../ui/supply/types';

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
  'Switch Aave to Core, Prime, Base, Arbitrum, Polygon or Monad.';

const SDK = {
  api: intentsConnectApi,
  intentsApi,
  alchemyApiKey: ALCHEMY_API_KEY,
};

/** Never called: the modal only builds plans for a supported market. */
const noPlan = (): never => {
  throw new Error('This market is not supported');
};

/**
 * Off app.aave.com there's no Aave account: the preview supplies "for" this
 * one so every screen shows, and never supplies.
 */
const PREVIEW_OWNER = '0x000000000000000000000000000000000000dEaD';

const PREVIEW_NOTICE =
  "This is a theme preview: nothing is supplied off app.aave.com. Open Aave's site to supply.";

/**
 * The integration: reads what app.aave.com shows and hands it to the modal,
 * as a dApp would pass its own state to the UI package. As a `preview` on
 * another site, it shows the same screens in that site's look, from Aave's
 * default market, without Aave's theme hints, and never supplies.
 */
export const App = ({ preview = false }: { preview?: boolean }) => {
  const open = useSyncExternalStore(modal.subscribe, modal.get);
  const { account, market } = usePageState(open && !preview);
  const aaveMarket = getAaveMarket(market);
  const owner = preview ? PREVIEW_OWNER : (account?.address ?? null);
  const { reserves, error } = useAaveReserves(aaveMarket, evmRpcUrl, open);

  // Stable while the market and its reserves are: a new option list or plan
  // builder re-quotes.
  const options = useMemo(
    () =>
      aaveMarket &&
      reserves?.map((reserve): SupplyOption => {
        // The wrapped native reserve takes the native token, through the
        // gateway: that is the route the bridge has liquidity for.
        const native =
          aaveMarket.native?.reserve.toLowerCase() ===
          reserve.asset.toLowerCase();

        return {
          id: reserve.asset,
          symbol: native ? aaveMarket.native!.symbol : reserve.symbol,
          chain: aaveMarket.chain,
          tokenAddress: native ? undefined : reserve.asset,
          decimals: reserve.decimals,
          apy: reserve.supplyApy,
          unavailable: reserve.unavailable,
        };
      }),
    [aaveMarket, reserves],
  );

  const buildPlan = useMemo(
    () =>
      aaveMarket && owner ? buildAaveSupplyPlan(aaveMarket, owner) : noPlan,
    [aaveMarket, owner],
  );

  const destination: SupplyDestination = aaveMarket
    ? {
        title: `Aave ${marketTitle(aaveMarket)}`,
        supported: true,
        options,
        optionsError: error,
        buildPlan,
      }
    : {
        title: 'Aave',
        supported: false,
        hint: UNSUPPORTED_HINT,
        buildPlan,
      };

  return (
    <SupplyModal
      open={open}
      onClose={modal.close}
      dappName="Aave"
      positionOwner={owner}
      dappWalletName={preview ? undefined : account?.walletName}
      destination={destination}
      sdk={SDK}
      walletConnect={walletConnect}
      tonConnect={tonConnect}
      connectorOptions={connectorOptions}
      walletSources={walletSources}
      theme={preview ? undefined : AAVE_THEME}
      readOnly={preview ? PREVIEW_NOTICE : undefined}
    />
  );
};
