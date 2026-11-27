import { actionRecipe } from '@aurora-is-near/intents-connect';
import type {
  IntentsConnectActionsApi,
  SupportedToken,
} from '@aurora-is-near/intents-connect';

import type { BorrowParams } from '@/domains/borrow/utils/recipe';

import {
  AAVE_BORROW_INTENT,
  AAVE_BORROW_MARKETS,
  aaveBorrowTitle,
  BORROW_ACTION,
} from './config/borrowAction';
import { AAVE_V3_MARKETS } from './config/registry';
import { readAaveReserves } from './reserves';
import {
  actionAvailability,
  actionPairOf,
  markCoverage,
} from './utils/coverage';
import {
  intersectSupported,
  listDeliveredTokens,
  withDeliveredAssets,
} from './utils/supported';
import type {
  LendingMarket,
  LendingMarketAdapter,
  MarketSnapshot,
} from '../types';
import type { AaveMarket } from './config/registry';
import type { AaveReadClient } from './reserves';
import type { ActionAvailability } from './utils/coverage';
import type { SupportedTokensApi } from './utils/supported';

const AAVE_V3_ADAPTER_ID = 'aave-v3';

export type AaveV3AdapterOptions = {
  /** The Intents Connect client: what 1Click can deliver. */
  api: SupportedTokensApi;
  /** The read client for a chain, such as `getClient` from `./config/clients`. */
  getClient: (chainId: number) => AaveReadClient;
  /** The hosted actions API: the catalog, and the borrow steps. */
  actionsApi: Pick<IntentsConnectActionsApi, 'listActions' | 'resolveAction'>;
};

const toLendingMarket = (market: AaveMarket): LendingMarket => ({
  id: `${AAVE_V3_ADAPTER_ID}:${market.chain}`,
  provider: AAVE_V3_ADAPTER_ID,
  name: 'Aave',
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
  actionsApi,
}: AaveV3AdapterOptions): LendingMarketAdapter => {
  let inFlightTokens: Promise<SupportedToken[]> | undefined;
  let availability: Promise<ActionAvailability> | undefined;
  let reported = false;

  // What the served borrow action accepts, read once per page: a success is
  // kept, a failure dropped so the next snapshot asks again (and rejects
  // with it, as for the token list). A mismatch with the pin is logged once.
  const served = () => {
    availability ??= actionsApi
      .listActions()
      .then((catalog) => {
        const { available, problem } = actionAvailability(catalog);

        if (problem && !reported) {
          reported = true;
          console.error(
            `[Borrow] ${problem}. Reserves it does not accept show as "Coming soon"; update BORROW_ACTION in domains/markets/aaveV3/config/borrowAction.ts.`,
          );
        }

        return available;
      })
      .catch((error: unknown) => {
        availability = undefined;
        throw error;
      });

    return availability;
  };

  const deliveredTokens = () => {
    inFlightTokens ??= listDeliveredTokens(api).finally(() => {
      inFlightTokens = undefined;
    });

    return inFlightTokens;
  };

  return {
    id: AAVE_V3_ADAPTER_ID,

    listMarkets: async () => AAVE_V3_MARKETS.map(toLendingMarket),

    getMarketSnapshot: async (market): Promise<MarketSnapshot> => {
      const aave = aaveMarketOf(market);
      // The delivered tokens are listed while the reserves are read: they
      // only filter which reserves the multicall reads. Every promise is
      // awaited here, so the first failure is the one reported.
      const supporting = deliveredTokens().then((tokens) =>
        intersectSupported(tokens, aave),
      );

      const assets = supporting.then((supported) => supported.assets);

      const [supported, reserves, available] = await Promise.all([
        supporting,
        readAaveReserves(getClient(aave.chainId), aave, { assets }),
        served(),
        assets,
      ]);

      return {
        market: toLendingMarket(aave),
        baseCurrencyUnit: reserves.baseCurrencyUnit,
        ...markCoverage(
          aave,
          withDeliveredAssets(reserves, supported),
          available,
        ),
      };
    },

    // The hosted `aave-v3-borrow` action as a recipe: the reserves are
    // mapped to its input symbols by chain and address (or native delivery),
    // and a reserve it does not cover throws. Each build resolves the pinned
    // action; the runner takes only its steps.
    borrowRecipe: ({ market, collateral, borrow, flow }) => {
      const aave = aaveMarketOf(market);
      const pair = actionPairOf(aave, collateral, borrow);
      const table = AAVE_BORROW_MARKETS[aave.chain];
      const supplied = table.collateral[pair.collateral]!;
      const borrowed = table.borrow[pair.borrowAsset]!;

      return actionRecipe<BorrowParams>({
        api: actionsApi,
        actionId: BORROW_ACTION.id,
        version: BORROW_ACTION.version,
        expectedSha256Hash: BORROW_ACTION.sha256Hash,
        id: `aave-borrow:${toLendingMarket(aave).id}:${supplied.label}:${borrowed.label}`,
        intent: AAVE_BORROW_INTENT,
        title: aaveBorrowTitle(table, supplied, borrowed),
        flow,
        destination: {
          chain: aave.chain,
          assetId: supplied.assetId,
          // Native delivery arrives as the chain's gas token: no contract.
          tokenAddress: supplied.native ? undefined : supplied.address,
        },
        inputs: (ctx, params) => ({
          chain: aave.chain,
          collateral: pair.collateral,
          borrowAsset: pair.borrowAsset,
          borrowAmount: params.borrowAmount,
          recipient: params.recipient ?? ctx.userAddress,
          // Bridge-in: the action needs the bridged asset and amount for its
          // quote, though the runner keeps its own and takes only the steps,
          // which supply `{MIN_AMOUNT_OUT}`. Steps-only: the collateral the
          // steps spend, which the runner varies (the post-fee amount).
          ...(flow === 'bridge-in'
            ? { originAsset: params.originAsset, amount: params.originAmount }
            : { amount: ctx.amount }),
        }),
      });
    },
  };
};
