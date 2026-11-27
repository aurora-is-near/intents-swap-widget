import {
  actionRecipe,
  BACKEND_PLACEHOLDERS,
} from '@aurora-is-near/intents-connect';
import type {
  IntentsConnectActionsApi,
  StepContext,
  SupportedToken,
} from '@aurora-is-near/intents-connect';

import { collateralDestination } from '@/domains/borrow/utils/recipe';
import type { BorrowParams } from '@/domains/borrow/utils/recipe';

import {
  AAVE_BORROW_INTENT,
  AAVE_BORROW_MARKETS,
  aaveBorrowTitle,
  BORROW_ACTION,
} from './config/borrowAction';
import { AAVE_V3_MARKETS } from './config/registry';
import { readAaveReserves } from './reserves';
import { actionPairOf, markCoverage } from './utils/coverage';
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
import type { SupportedTokensApi } from './utils/supported';

const AAVE_V3_ADAPTER_ID = 'aave-v3';

export type AaveV3AdapterOptions = {
  /** The Intents Connect client: what 1Click can deliver. */
  api: SupportedTokensApi;
  /** The read client for a chain, such as `getClient` from `./config/clients`. */
  getClient: (chainId: number) => AaveReadClient;
  /** The hosted actions API the borrow steps are resolved from. */
  actionsApi: Pick<IntentsConnectActionsApi, 'resolveAction'>;
};

/**
 * A bridge-in borrow's amount inputs: the bridged asset and amount, which the
 * action needs for its quote though the runner keeps its own and takes only
 * the steps. Those steps supply `{MIN_AMOUNT_OUT}`, which only the
 * placeholder fee strategy (the default) substitutes; under `threeRound` the
 * runner's concrete amounts would never reach them, so that fails here.
 */
const bridgeInInputs = (
  ctx: StepContext,
  { originAsset, originAmount }: BorrowParams,
) => {
  if (ctx.amount !== BACKEND_PLACEHOLDERS.minAmountOut) {
    throw new Error(
      `the borrow action supplies ${BACKEND_PLACEHOLDERS.minAmountOut} on bridge-in; plan it with the placeholder fee strategy`,
    );
  }

  if (originAsset === undefined || originAmount === undefined) {
    throw new Error(
      'a bridge-in borrow needs params.originAsset and params.originAmount',
    );
  }

  return { originAsset, amount: originAmount };
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

      const [supported, reserves] = await Promise.all([
        supporting,
        readAaveReserves(getClient(aave.chainId), aave, { assets }),
        assets,
      ]);

      return {
        market: toLendingMarket(aave),
        baseCurrencyUnit: reserves.baseCurrencyUnit,
        ...markCoverage(aave, withDeliveredAssets(reserves, supported)),
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
        title: aaveBorrowTitle(aave, supplied, borrowed),
        flow,
        // As 1Click delivers the reserve: the asset id it lists, and no
        // contract for native delivery. The SDK checks it is what the action
        // resolves.
        destination: collateralDestination(aave, collateral),
        inputs: (ctx, params) => ({
          chain: aave.chain,
          collateral: pair.collateral,
          borrowAsset: pair.borrowAsset,
          borrowAmount: params.borrowAmount,
          recipient: params.recipient ?? ctx.userAddress,
          // Steps-only: the collateral the steps spend, which the runner
          // varies (the post-fee amount).
          ...(flow === 'bridge-in'
            ? bridgeInInputs(ctx, params)
            : { amount: ctx.amount }),
        }),
      });
    },
  };
};
