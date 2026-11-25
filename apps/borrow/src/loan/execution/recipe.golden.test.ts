import type { Recipe, StepContext } from '@aurora-is-near/intents-connect';
import {
  AAVE_BORROW_MARKETS,
  type AaveBorrowAsset,
  type AaveBorrowToken,
  type AaveCollateralAsset,
} from '@aurora-is-near/intents-connect-actions';
import { aaveBorrowRecipe as actionRecipe } from '@aurora-is-near/intents-connect-actions/sdk';
import { describe, expect, it, vi } from 'vitest';

import { createAaveV3Adapter } from '../../markets/aaveV3';
import { AAVE_V3_MARKETS } from '../../markets/aaveV3/registry';
import type { LendingMarket } from '../../markets/types';
import { usdc, weth } from '../../tests/fakeMarkets';
import golden from './recipe.golden.json';
import { aaveBorrowRecipe, type BorrowParams } from './recipe';

/**
 * The borrow recipe as the app built it before its steps came from the
 * `aave-v3-borrow` action (`recipe.golden.json`, captured from the app's own
 * step builder): for every pair in the action's tables, on both chains and in
 * both flows, the recipe and its steps must stay the same. Step `metadata` is
 * the only addition.
 */

const INTERMEDIARY = '0x00000000000000000000000000000000000000aa';
const USER = '0x00000000000000000000000000000000000000cc';
const RECIPIENT = '0x00000000000000000000000000000000000000bb';
const BORROW_AMOUNT = '1500000000';

const FLOWS = ['bridge-in', 'steps-only'] as const;

/** Bridge-in supplies the quote's minimum out; steps-only a literal. */
const AMOUNT_OF: Record<(typeof FLOWS)[number], string> = {
  'bridge-in': '{MIN_AMOUNT_OUT}',
  'steps-only': '123450000000000000',
};

const adapter = createAaveV3Adapter({
  api: { listSupportedTokens: vi.fn() },
  getClient: vi.fn(),
});

/** The reserve the adapter lists for a table entry. */
const collateralOf = (token: AaveBorrowToken) =>
  weth({
    asset: token.address as `0x${string}`,
    symbol: token.label,
    decimals: token.decimals,
    assetId: token.assetId,
    ...(token.native && { nativeDelivery: true }),
  });

const borrowOf = (token: AaveBorrowToken) =>
  usdc({
    asset: token.address as `0x${string}`,
    symbol: token.label,
    decimals: token.decimals,
    assetId: token.assetId,
  });

type Case = {
  key: string;
  recipe: Recipe<BorrowParams>;
  /** The same pair as the action's own recipe (the package's `sdk`). */
  action: Recipe<BorrowParams>;
  ctx: StepContext;
};

const casesOf = (markets: LendingMarket[]): Case[] =>
  markets.flatMap((market) => {
    const chain = market.chain as keyof typeof AAVE_BORROW_MARKETS;
    const table = AAVE_BORROW_MARKETS[chain];

    return Object.entries(table.collateral).flatMap(([collateral, supplied]) =>
      Object.entries(table.borrow).flatMap(([borrowed, borrow]) =>
        FLOWS.map((flow) => ({
          key: `${chain}:${collateral}:${borrowed}:${flow}`,
          recipe: aaveBorrowRecipe(
            adapter,
            market,
            collateralOf(supplied),
            borrowOf(borrow),
            flow,
          ),
          action: actionRecipe({
            chain,
            collateral: collateral as AaveCollateralAsset,
            borrowAsset: borrowed as AaveBorrowAsset,
            flow,
          }),
          ctx: {
            intermediary: INTERMEDIARY,
            userAddress: USER,
            amount: AMOUNT_OF[flow],
          },
        })),
      ),
    );
  });

const PARAMS: BorrowParams = {
  borrowAmount: BORROW_AMOUNT,
  recipient: RECIPIENT,
};

/** What the golden file records of a recipe: all but step `metadata`. */
const recordOf = ({
  key,
  recipe,
  ctx,
}: Pick<Case, 'key' | 'recipe' | 'ctx'>) => ({
  key,
  id: recipe.id,
  intent: recipe.intent,
  title: recipe.title,
  flow: recipe.flow,
  type: recipe.type,
  destination: recipe.destination,
  steps: recipe
    .buildSteps(ctx, PARAMS)
    .map(({ to, functionSignature, parameters, value }) => ({
      to,
      functionSignature,
      parameters,
      value,
    })),
});

describe('aaveBorrowRecipe golden', async () => {
  const markets = await adapter.listMarkets();
  const cases = casesOf(markets);

  it('covers every table pair on both chains in both flows', () => {
    expect(markets.map(({ chain }) => chain)).toEqual(
      AAVE_V3_MARKETS.map(({ chain }) => chain),
    );
    expect(cases.map(({ key }) => key)).toEqual(golden.map(({ key }) => key));
  });

  it.each(cases.map((entry) => [entry.key, entry] as const))(
    '%s is unchanged',
    (key, entry) => {
      expect(recordOf(entry)).toEqual(
        golden.find((recorded) => recorded.key === key),
      );
    },
  );

  it.each(cases.map((entry) => [entry.key, entry] as const))(
    '%s adds a name and a description to every step, and nothing else',
    (_key, { recipe, ctx }) => {
      recipe.buildSteps(ctx, PARAMS).forEach((step) => {
        expect(Object.keys(step).sort()).toEqual([
          'functionSignature',
          'metadata',
          'parameters',
          'to',
          'value',
        ]);
        expect(step.metadata).toEqual({
          name: expect.stringMatching(/\S/),
          description: expect.stringMatching(/\S/),
        });
      });
    },
  );

  it.each(cases.map((entry) => [entry.key, entry] as const))(
    '%s is the action’s own recipe',
    (_key, { recipe, action, ctx }) => {
      expect(recordOf({ key: _key, recipe: action, ctx })).toEqual(
        recordOf({ key: _key, recipe, ctx }),
      );
      expect(action.buildSteps(ctx, PARAMS)).toEqual(
        recipe.buildSteps(ctx, PARAMS),
      );
    },
  );
});
