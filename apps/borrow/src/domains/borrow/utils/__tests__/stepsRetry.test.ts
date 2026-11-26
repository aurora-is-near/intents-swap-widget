import { getIntermediaryBalance } from '@aurora-is-near/intents-connect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StepsPlan, StepsPreview } from '@aurora-is-near/intents-connect';

import { dryExecution } from '@/tests/executionFixtures';
import {
  createFakeAdapter,
  FAKE_BASE,
  nativeEth,
  pairSnapshot,
  USD,
  usdc,
  weth,
} from '@/tests/fakeMarkets';
import type { MarketSnapshot } from '@/domains/markets/types';

import { BorrowPreCheckError } from '../classifyBorrowError';
import { BorrowPreviewError } from '../preview';
import {
  buildBorrowStepsPlan,
  previewBorrowSteps,
  readWaitingCollateral,
} from '../stepsRetry';
import type { BorrowParams } from '../recipe';
import type { PreviewBorrowStepsInput } from '../stepsRetry';

vi.mock('@aurora-is-near/intents-connect', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@aurora-is-near/intents-connect')>()),
  getIntermediaryBalance: vi.fn(async () => '0'),
}));

const ETH = 10n ** 18n;
const INTERMEDIARY = '0x00000000000000000000000000000000000000aa';

/** `previewSteps()` carving a 0.01 WETH fee from what waits. */
const previewSteps = vi.fn(
  async (
    plan: StepsPlan<BorrowParams>,
  ): Promise<StepsPreview<BorrowParams>> => {
    const spendable = (BigInt(plan.amount) - 10n ** 16n).toString();

    return {
      execution: dryExecution(),
      networkFee: '10000000000000000',
      spendable,
      plan,
    };
  },
);

const input = (
  overrides: Partial<PreviewBorrowStepsInput> = {},
): PreviewBorrowStepsInput => ({
  adapter: createFakeAdapter({
    getMarketSnapshot: async () => pairSnapshot(FAKE_BASE),
  }),
  market: FAKE_BASE,
  collateral: weth(),
  borrow: usdc(),
  ltv: 50,
  intermediary: INTERMEDIARY,
  previewSteps,
  ...overrides,
});

beforeEach(() => {
  previewSteps.mockClear();
  // 0.99 WETH waits.
  vi.mocked(getIntermediaryBalance)
    .mockClear()
    .mockResolvedValue((99n * 10n ** 16n).toString());
});

describe('buildBorrowStepsPlan', () => {
  it('runs the borrow recipe steps-only over the waiting amount, the fee carved from it', () => {
    const plan = buildBorrowStepsPlan({
      adapter: createFakeAdapter(),
      market: FAKE_BASE,
      collateral: weth(),
      borrow: usdc(),
      amount: 99n * 10n ** 16n,
      borrowAmount: 1_000_000_000n,
      recipient: '',
    });

    expect(plan).toMatchObject({
      amount: '990000000000000000',
      feeFromAmount: true,
      params: { borrowAmount: '1000000000', recipient: undefined },
    });
    expect(plan.recipe.flow).toBe('steps-only');
    expect(plan.recipe.intent).toBe('aave_borrow');
  });

  it("runs the market adapter's steps-only recipe for the pair", () => {
    const adapter = createFakeAdapter();
    const plan = buildBorrowStepsPlan({
      adapter,
      market: FAKE_BASE,
      collateral: weth(),
      borrow: usdc(),
      amount: 1n,
      borrowAmount: 1n,
    });

    expect(adapter.borrowRecipe).toHaveBeenCalledWith({
      market: FAKE_BASE,
      collateral: weth(),
      borrow: usdc(),
      flow: 'steps-only',
    });
    expect(plan.recipe).toBe(adapter.borrowRecipe.mock.results[0]?.value);
  });
});

describe('previewBorrowSteps', () => {
  it('sizes the borrow on what is spendable after the fee, at the fresh price', async () => {
    const adapter = createFakeAdapter({
      // WETH fell to $2,000.
      getMarketSnapshot: async () =>
        pairSnapshot(FAKE_BASE, {
          collateral: [weth({ priceBase: 2_000n * USD })],
        }),
    });

    const previewed = await previewBorrowSteps(input({ adapter }));

    // 50% of 0.98 WETH at $2,000.
    expect(previewed.borrowAmount).toBe(980_000_000n);
    expect(previewed.collateral.priceBase).toBe(2_000n * USD);
    expect(previewSteps).toHaveBeenCalledTimes(2);
    expect(previewSteps.mock.calls[1]?.[0].params.borrowAmount).toBe(
      '980000000',
    );
    expect(previewed.steps.spendable).toBe((98n * 10n ** 16n).toString());
  });

  it.each<[string, Partial<Pick<MarketSnapshot, 'collateral' | 'borrowable'>>]>(
    [
      [
        'collateral',
        {
          collateral: [
            weth({ unavailable: true, unavailableReason: 'coming-soon' }),
          ],
        },
      ],
      [
        'borrow token',
        {
          borrowable: [
            usdc({ unavailable: true, unavailableReason: 'coming-soon' }),
          ],
        },
      ],
    ],
  )(
    'refuses a %s the borrow action no longer covers, before reading or building anything',
    async (_side, reserves) => {
      const adapter = createFakeAdapter({
        getMarketSnapshot: async () => pairSnapshot(FAKE_BASE, reserves),
      });

      await expect(
        previewBorrowSteps(input({ adapter })),
      ).rejects.toMatchObject({
        constructor: BorrowPreviewError,
        reason: 'pairUnsupported',
        message: 'Aave on Base no longer opens loans of USDC against WETH',
      });
      expect(getIntermediaryBalance).not.toHaveBeenCalled();
      expect(adapter.borrowRecipe).not.toHaveBeenCalled();
      expect(previewSteps).not.toHaveBeenCalled();
    },
  );

  it('still retries a pair whose cap is reached: only coming soon is refused', async () => {
    const adapter = createFakeAdapter({
      getMarketSnapshot: async () =>
        pairSnapshot(FAKE_BASE, {
          collateral: [
            weth({ unavailable: true, unavailableReason: 'cap-reached' }),
          ],
        }),
    });

    await expect(previewBorrowSteps(input({ adapter }))).resolves.toMatchObject(
      { borrowAmount: expect.any(BigInt) },
    );
  });

  it('refuses when nothing waits', async () => {
    vi.mocked(getIntermediaryBalance).mockResolvedValueOnce('0');

    await expect(previewBorrowSteps(input())).rejects.toMatchObject({
      constructor: BorrowPreviewError,
      reason: 'nothingWaiting',
    });
    expect(previewSteps).not.toHaveBeenCalled();
  });

  it('refuses when the fee moved up between the two dry runs', async () => {
    previewSteps
      .mockImplementationOnce(async (plan) => ({
        execution: dryExecution(),
        spendable: (98n * 10n ** 16n).toString(),
        plan,
      }))
      .mockImplementationOnce(async (plan) => ({
        execution: dryExecution(),
        spendable: (97n * 10n ** 16n).toString(),
        plan,
      }));

    await expect(previewBorrowSteps(input())).rejects.toMatchObject({
      reason: 'quoteMoved',
    });
  });

  it('is out of liquidity when the market can no longer lend it', async () => {
    const adapter = createFakeAdapter({
      getMarketSnapshot: async () =>
        pairSnapshot(FAKE_BASE, {
          borrowable: [usdc({ availableLiquidity: 10n })],
        }),
    });

    await expect(previewBorrowSteps(input({ adapter }))).rejects.toBeInstanceOf(
      BorrowPreCheckError,
    );
  });
});

describe('readWaitingCollateral', () => {
  it('reads the token at the intermediary on the market’s chain, through Borrow’s RPC', async () => {
    vi.mocked(getIntermediaryBalance).mockResolvedValueOnce('5');

    await expect(
      readWaitingCollateral({
        intermediary: INTERMEDIARY,
        market: FAKE_BASE,
        collateral: weth(),
      }),
    ).resolves.toBe(5n);

    expect(getIntermediaryBalance).toHaveBeenCalledWith({
      intermediary: { evm: INTERMEDIARY },
      destination: {
        chain: 'base',
        assetId: 'nep141:weth',
        tokenAddress: weth().asset,
      },
      rpcs: { base: [expect.any(String)] },
    });
  });

  it('reads the native balance for native delivery', async () => {
    vi.mocked(getIntermediaryBalance).mockResolvedValueOnce(ETH.toString());

    await readWaitingCollateral({
      intermediary: INTERMEDIARY,
      market: FAKE_BASE,
      collateral: nativeEth(),
    });

    expect(vi.mocked(getIntermediaryBalance).mock.lastCall?.[0]).toMatchObject({
      destination: { tokenAddress: undefined },
    });
  });
});
