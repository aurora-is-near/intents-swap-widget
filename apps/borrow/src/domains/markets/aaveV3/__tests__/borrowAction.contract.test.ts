import { describe, expect, it, vi } from 'vitest';
import { createIntentsConnectActionsApi } from '@aurora-is-near/intents-connect';
import type {
  ActionResolution,
  StepContext,
} from '@aurora-is-near/intents-connect';

import { nativeEth, usdc, weth } from '@/tests/fakeMarkets';
import type { BorrowParams } from '@/domains/borrow/utils/recipe';

import { createAaveV3Adapter } from '..';
import {
  AAVE_BORROW_ASSETS,
  AAVE_BORROW_CHAINS,
  AAVE_BORROW_MARKETS,
  AAVE_COLLATERAL_ASSETS,
  BORROW_ACTION,
} from '../config/borrowAction';
import { AAVE_V3_MARKETS } from '../config/registry';
import golden from './borrowAction.golden.json';
import type { LendingMarket } from '../../types';
import type {
  AaveBorrowAsset,
  AaveBorrowChain,
  AaveCollateralAsset,
} from '../config/borrowAction';

/**
 * The contract between Borrow and the hosted `aave-v3-borrow` action, pinned
 * for every pair in the app's tables and both flows in
 * `borrowAction.golden.json`: the inputs Borrow sends and what the action
 * (at `BORROW_ACTION.sha256Hash`) resolves them to, recorded from the demo
 * actions API.
 *
 * - Offline (always): the adapter's recipe for each pair sends exactly those
 *   inputs, describes what the action resolves (so the SDK's
 *   `ACTION_MISMATCH` check passes), and hands on the resolved steps.
 * - Live (`BORROW_ACTIONS_LIVE=1`, against
 *   `INTENTS_CONNECT_ACTIONS_API_URL`, default the demo deployment): the
 *   catalog still serves the pinned action, its script's tables equal the
 *   app's copy, and every recorded input still resolves to the recorded
 *   execution. Re-record the golden file when the pin moves.
 */

type GoldenEntry = {
  key: string;
  flow: 'bridge-in' | 'steps-only';
  inputs: {
    chain: AaveBorrowChain;
    collateral: AaveCollateralAsset;
    borrowAsset: AaveBorrowAsset;
    borrowAmount: string;
    recipient: string;
    amount: string;
    originAsset?: string;
  };
  resolution: ActionResolution;
};

const ENTRIES = golden as GoldenEntry[];

const ACTIONS_API_URL =
  process.env.INTENTS_CONNECT_ACTIONS_API_URL ??
  'https://intents-connect-actions-demo.aurora.dev';

const MARKETS: Record<AaveBorrowChain, LendingMarket> = {
  base: {
    id: 'aave-v3:base',
    provider: 'aave-v3',
    name: 'Aave',
    chain: 'base',
    chainId: 8453,
    chainLabel: 'Base',
  },
  arb: {
    id: 'aave-v3:arb',
    provider: 'aave-v3',
    name: 'Aave',
    chain: 'arb',
    chainId: 42161,
    chainLabel: 'Arbitrum',
  },
};

/** The reserves the adapter would list for an entry's table tokens. */
const reservesOf = ({ inputs, resolution }: GoldenEntry) => {
  const table = AAVE_BORROW_MARKETS[inputs.chain];
  const supplied = table.collateral[inputs.collateral]!;
  const borrowed = table.borrow[inputs.borrowAsset]!;
  const asset = supplied.address as `0x${string}`;
  // As 1Click lists the collateral: the asset the action delivers.
  const assetId =
    resolution.execution.quote?.destinationAsset ??
    resolution.execution.destinationAsset;

  return {
    collateral: supplied.native
      ? // Aave's wrapped-native reserve, delivered as the gas token.
        nativeEth({ asset, symbol: 'WETH', assetId })
      : weth({ asset, symbol: supplied.label, assetId }),
    borrow: usdc({
      asset: borrowed.address as `0x${string}`,
      symbol: borrowed.label,
    }),
  };
};

const CTX: Omit<StepContext, 'amount'> = {
  intermediary: '0x00000000000000000000000000000000000000aa',
  userAddress: '0x00000000000000000000000000000000000000cc',
};

/** The step context and params the runner would build an entry from. */
const buildArgs = ({ flow, inputs }: GoldenEntry) => {
  const params: BorrowParams = {
    borrowAmount: inputs.borrowAmount,
    recipient: inputs.recipient,
    ...(flow === 'bridge-in'
      ? { originAsset: inputs.originAsset, originAmount: inputs.amount }
      : {}),
  };

  return {
    ctx: {
      ...CTX,
      // Bridge-in steps supply the bridge's minimum received; steps-only
      // steps spend a literal the runner sizes.
      amount: flow === 'bridge-in' ? '{MIN_AMOUNT_OUT}' : inputs.amount,
    },
    params,
  };
};

describe('the hosted borrow action contract (recorded)', () => {
  it('covers every pair of the tables in both flows', () => {
    const pairs = AAVE_BORROW_CHAINS.flatMap((chain) => {
      const table = AAVE_BORROW_MARKETS[chain];

      return Object.keys(table.collateral).flatMap((collateral) =>
        Object.keys(table.borrow).map(
          (borrowAsset) => `${chain}:${collateral}:${borrowAsset}`,
        ),
      );
    });

    expect(ENTRIES.map(({ key }) => key).sort()).toEqual(
      pairs
        .flatMap((pair) => [`${pair}:bridge-in`, `${pair}:steps-only`])
        .sort(),
    );

    ENTRIES.forEach(({ resolution }) => {
      expect(resolution.actionSha256Hash).toBe(BORROW_ACTION.sha256Hash);
    });
  });

  it.each(ENTRIES.map((entry) => [entry.key, entry] as const))(
    '%s: sends the recorded inputs and hands on the resolved steps',
    async (_, entry) => {
      const resolveAction = vi.fn(async () => entry.resolution);
      const adapter = createAaveV3Adapter({
        api: { listSupportedTokens: vi.fn() },
        getClient: vi.fn(),
        actionsApi: { resolveAction },
      });

      const recipe = adapter.borrowRecipe({
        market: MARKETS[entry.inputs.chain],
        ...reservesOf(entry),
        flow: entry.flow,
      });

      const { ctx, params } = buildArgs(entry);

      await expect(recipe.buildSteps(ctx, params)).resolves.toEqual(
        entry.resolution.execution.steps,
      );
      expect(resolveAction).toHaveBeenCalledWith(BORROW_ACTION.id, {
        version: BORROW_ACTION.version,
        expectedSha256Hash: BORROW_ACTION.sha256Hash,
        inputs: entry.inputs,
      });
    },
  );
});

type ScriptToken = { label: string; address: string; native: boolean };

type ScriptMarket = {
  chainLabel: string;
  pool: string;
  gateway: string;
  borrow: Record<string, ScriptToken>;
  collateral: Record<string, ScriptToken>;
};

/** The script's `MARKETS` literal as JSON (double quotes, no comments). */
const marketsOf = (script: string): Record<string, ScriptMarket> => {
  const literal = /^MARKETS = (\{\n[\s\S]*?\n\})\n/m.exec(script)?.[1];

  if (literal === undefined) {
    throw new Error('the served script has no top-level MARKETS = {...}');
  }

  return JSON.parse(
    literal
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/,(\s*[}\]])/g, '$1'),
  );
};

describe.skipIf(!process.env.BORROW_ACTIONS_LIVE)(
  'the hosted borrow action contract (live)',
  () => {
    const api = createIntentsConnectActionsApi({ baseUrl: ACTIONS_API_URL });

    it('is served at the pinned hash, with the app’s tables and symbols', async () => {
      const served = (await api.listActions()).find(
        ({ id, version }) =>
          id === BORROW_ACTION.id && version === BORROW_ACTION.version,
      );

      expect(served?.sha256Hash).toBe(BORROW_ACTION.sha256Hash);
      expect(served?.supportedChains).toEqual([...AAVE_BORROW_CHAINS]);

      const { properties } = served?.inputSchema as {
        properties: Record<string, { enum?: string[] }>;
      };

      expect(properties.collateral?.enum).toEqual([...AAVE_COLLATERAL_ASSETS]);
      expect(properties.borrowAsset?.enum).toEqual([...AAVE_BORROW_ASSETS]);

      const markets = marketsOf(served?.script ?? '');
      const tokens = (table: Record<string, ScriptToken>) =>
        Object.fromEntries(
          Object.entries(table).map(([symbol, { label, address, native }]) => [
            symbol,
            { label, address, native },
          ]),
        );

      // The app's token tables are the script's, as far as the app reads them.
      expect(
        Object.fromEntries(
          Object.entries(markets).map(([chain, market]) => [
            chain,
            {
              borrow: tokens(market.borrow),
              collateral: tokens(market.collateral),
            },
          ]),
        ),
      ).toEqual(AAVE_BORROW_MARKETS);

      // The steps go to the Pool and gateway the app reads its markets from.
      AAVE_V3_MARKETS.forEach(({ chain, chainLabel, pool, native }) => {
        expect(markets[chain]).toMatchObject({
          chainLabel,
          pool,
          gateway: native?.gateway,
        });
      });
    });

    it.each(ENTRIES.map((entry) => [entry.key, entry] as const))(
      '%s: still resolves to the recorded execution',
      async (_, entry) => {
        await expect(
          api.resolveAction(BORROW_ACTION.id, {
            version: BORROW_ACTION.version,
            expectedSha256Hash: BORROW_ACTION.sha256Hash,
            inputs: entry.inputs,
          }),
        ).resolves.toEqual(entry.resolution);
      },
    );
  },
);
