import type { SupportedToken } from '@aurora-is-near/intents-connect';
import { buildAaveBorrowSteps } from '@aurora-is-near/intents-connect-actions';

import type {
  LendingMarket,
  LendingMarketAdapter,
  MarketSnapshot,
} from '../types';
import { actionPairOf, markCoverage } from './coverage';
import { AAVE_V3_MARKETS, type AaveMarket } from './registry';
import { type AaveReadClient, readAaveReserves } from './reserves';
import {
  intersectSupported,
  listDeliveredTokens,
  type SupportedTokensApi,
  withDeliveredAssets,
} from './supported';

export const AAVE_V3_ADAPTER_ID = 'aave-v3';

const AAVE_NAME = 'Aave';

export type AaveV3AdapterOptions = {
  /** The Intents Connect client: what 1Click can deliver. */
  api: SupportedTokensApi;
  /** The read client for a chain, such as `getClient` from `./clients`. */
  getClient: (chainId: number) => AaveReadClient;
};

const toLendingMarket = (market: AaveMarket): LendingMarket => ({
  id: `${AAVE_V3_ADAPTER_ID}:${market.chain}`,
  provider: AAVE_V3_ADAPTER_ID,
  name: AAVE_NAME,
  chain: market.chain,
  chainId: market.chainId,
  chainLabel: market.chainLabel,
});

/** The registry entry behind `market`; throws for a market it doesn't list. */
const aaveMarketOf = (market: LendingMarket): AaveMarket => {
  const aave = AAVE_V3_MARKETS.find(
    (entry) => toLendingMarket(entry).id === market.id,
  );

  if (!aave) {
    throw new Error(`Aave V3: unknown market ${market.id}`);
  }

  return aave;
};

/**
 * Aave V3 on Borrow's launch chains (Base and Arbitrum). A snapshot is the
 * reserves 1Click can deliver: the supported token list first (a failed list
 * rejects), then one pinned read of only those reserves. Those the borrow
 * action does not cover stay listed, marked `coming-soon`. Caching is left to
 * the caller (react-query in `useMarketSnapshots`); snapshots read at the same
 * time share one token list request, which is dropped once it settles, so a
 * failure is never reused.
 */
export const createAaveV3Adapter = ({
  api,
  getClient,
}: AaveV3AdapterOptions): LendingMarketAdapter => {
  let inFlightTokens: Promise<SupportedToken[]> | undefined;

  const deliveredTokens = () => {
    inFlightTokens ??= listDeliveredTokens(api).finally(() => {
      inFlightTokens = undefined;
    });

    return inFlightTokens;
  };

  return {
    id: AAVE_V3_ADAPTER_ID,
    name: AAVE_NAME,

    listMarkets: async () => AAVE_V3_MARKETS.map(toLendingMarket),

    getMarketSnapshot: async (market): Promise<MarketSnapshot> => {
      const aave = aaveMarketOf(market);
      const supported = intersectSupported(await deliveredTokens(), aave);
      const reserves = await readAaveReserves(getClient(aave.chainId), aave, {
        assets: supported.assets,
      });

      return {
        market: toLendingMarket(aave),
        blockNumber: reserves.blockNumber,
        baseCurrencyUnit: reserves.baseCurrencyUnit,
        ...markCoverage(aave, withDeliveredAssets(reserves, supported)),
      };
    },

    // The `aave-v3-borrow` action's steps, built with real values: the
    // reserves are mapped to its table symbols by chain and address (or
    // native delivery), and a reserve it does not cover throws.
    buildBorrowSteps: ({
      market,
      collateral,
      borrow,
      amount,
      borrowAmount,
      owner,
      recipient,
    }) => {
      const aave = aaveMarketOf(market);

      return buildAaveBorrowSteps({
        chain: aave.chain,
        ...actionPairOf(aave, collateral, borrow),
        collateralAmount: amount,
        borrowAmount,
        owner,
        recipient,
      });
    },
  };
};
