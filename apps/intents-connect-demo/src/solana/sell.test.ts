// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Execution,
  StepsPlan,
  StepsPreview,
} from '@aurora-is-near/intents-connect';

import { buildSolanaSellPlan, previewSolanaSell } from './sell';
import type { SolanaSellParams } from './sell';
import { buildJupiterSwap, prepareJupiterBuild } from './jupiter';
import { BUY_TOKENS, SOLANA_USDC } from './constants';
import { validateMints } from './client';
import { INTERMEDIARY, jupiterFixture, WALLET } from './testFixtures';

vi.mock('./client', () => ({
  getSolanaConnection: vi.fn(),
  validateMints: vi.fn(),
}));
vi.mock('./jupiter', async (original) => ({
  ...(await original<typeof import('./jupiter')>()),
  buildJupiterSwap: vi.fn(),
}));

const BOUGHT = BUY_TOKENS[0]!;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(validateMints).mockResolvedValue(undefined);
  vi.mocked(buildJupiterSwap).mockImplementation(async (input) =>
    prepareJupiterBuild(jupiterFixture(input), input),
  );
});

/** A previewSteps() stand-in that runs the recipe like the SDK would. */
const fakePreviewSteps =
  (networkFee: string) =>
  async <TParams>(plan: StepsPlan<TParams>): Promise<StepsPreview<TParams>> => {
    const prepared =
      plan.recipe.type === 'solana'
        ? await plan.recipe.buildSteps(
            {
              intermediary: INTERMEDIARY,
              userAddress: WALLET,
              amount: plan.amount,
            },
            plan.params,
          )
        : { steps: [] };

    return {
      execution: {
        details: { intermediaryAddress: INTERMEDIARY, networkFee },
      } as Execution,
      networkFee,
      spendable: plan.amount,
      plan: {
        ...plan,
        prepared: {
          ...prepared,
          walletAddress: WALLET,
          intermediary: INTERMEDIARY,
          amount: plan.amount,
          spendable: plan.amount,
          networkFee,
          expiresAt: new Date(Date.now() + 30_000).toISOString(),
        },
      },
    };
  };

describe('buildSolanaSellPlan', () => {
  it('describes a steps-only swap of the whole balance into USDC', async () => {
    const plan = buildSolanaSellPlan({ token: BOUGHT, amount: '5000000' });

    expect(plan).toMatchObject({
      amount: '5000000',
      params: { mint: BOUGHT.mint },
      previewTtlMs: 30_000,
      recipe: {
        id: `solana-sell-${BOUGHT.symbol.toLowerCase()}`,
        flow: 'steps-only',
        type: 'solana',
        destination: {
          chain: 'sol',
          assetId: SOLANA_USDC.assetId,
          tokenAddress: SOLANA_USDC.mint,
        },
      },
    });
    expect(plan.feeFromAmount).toBeUndefined();

    if (plan.recipe.type !== 'solana') {
      throw new Error('expected a Solana recipe');
    }

    await plan.recipe.buildSteps(
      { intermediary: INTERMEDIARY, userAddress: WALLET, amount: '5000000' },
      plan.params,
    );

    expect(buildJupiterSwap).toHaveBeenCalledWith({
      intermediary: INTERMEDIARY,
      amount: '5000000',
      input: BOUGHT,
      output: SOLANA_USDC,
    });
  });
});

describe('previewSolanaSell', () => {
  it('builds Jupiter once, caps the fee below the guaranteed output, and reports USDC figures', async () => {
    const plan = buildSolanaSellPlan({ token: BOUGHT, amount: '5000000' });
    const previewed: StepsPlan<SolanaSellParams>[] = [];
    const previewSteps = async <TParams>(input: StepsPlan<TParams>) => {
      previewed.push(input as unknown as StepsPlan<SolanaSellParams>);

      return fakePreviewSteps('100000')(input);
    };

    const quote = await previewSolanaSell(
      { previewSteps },
      plan,
      BOUGHT,
      INTERMEDIARY,
    );

    expect(validateMints).toHaveBeenCalledWith(undefined, [
      BOUGHT,
      SOLANA_USDC,
    ]);
    // One upfront build at the plan amount; the SDK's own call reuses it.
    expect(buildJupiterSwap).toHaveBeenCalledOnce();
    // The fixture doubles the input; the minimum is 99.5% of that.
    expect(quote.receive).toBe('10000000');
    expect(quote.minimumReceive).toBe('9950000');
    expect(quote.networkFee).toBe('100000');
    expect(quote.expiresAt).toBeGreaterThan(Date.now());

    // The cap travels on the plan the SDK priced, so it lands in metadata and
    // survives a cross-session resume.
    expect(previewed[0]).toMatchObject({ maxNetworkFee: '9949999' });
    expect(quote.preview.plan.maxNetworkFee).toBe('9949999');
  });

  it('rebuilds when the SDK asks for a different amount or account', async () => {
    const plan = buildSolanaSellPlan({ token: BOUGHT, amount: '5000000' });
    const previewSteps = async <TParams>(input: StepsPlan<TParams>) => {
      if (input.recipe.type === 'solana') {
        await input.recipe.buildSteps(
          {
            intermediary: INTERMEDIARY,
            userAddress: WALLET,
            amount: '4000000',
          },
          input.params,
        );
      }

      return fakePreviewSteps('100000')({ ...input, amount: '4000000' });
    };

    const quote = await previewSolanaSell(
      { previewSteps },
      plan,
      BOUGHT,
      INTERMEDIARY,
    );

    // The rebuilt swap is what gets shown: 4 000 000 × 1.99.
    expect(buildJupiterSwap).toHaveBeenCalledTimes(2);
    expect(quote.minimumReceive).toBe('7960000');
  });

  it('refuses a preview whose spendable does not match the kept build', async () => {
    const plan = buildSolanaSellPlan({ token: BOUGHT, amount: '5000000' });
    const previewSteps = async <TParams>(input: StepsPlan<TParams>) => ({
      ...(await fakePreviewSteps('100000')(input)),
      spendable: '4999999',
    });

    await expect(
      previewSolanaSell({ previewSteps }, plan, BOUGHT, INTERMEDIARY),
    ).rejects.toThrow(/Could not confirm/);
  });

  it('refuses a sale that guarantees no USDC output', async () => {
    vi.mocked(buildJupiterSwap).mockImplementation(async (input) => ({
      ...prepareJupiterBuild(jupiterFixture(input), input),
      minimumOutput: '1',
    }));
    const plan = buildSolanaSellPlan({ token: BOUGHT, amount: '1' });

    await expect(
      previewSolanaSell(
        { previewSteps: fakePreviewSteps('0') },
        plan,
        BOUGHT,
        INTERMEDIARY,
      ),
    ).rejects.toThrow(/too small to sell/);
  });

  it('passes through a preview without a fee figure', async () => {
    const plan = buildSolanaSellPlan({ token: BOUGHT, amount: '5000000' });
    const previewSteps = async <TParams>(input: StepsPlan<TParams>) => {
      const preview = await fakePreviewSteps('100000')(input);

      return { ...preview, networkFee: undefined };
    };

    const quote = await previewSolanaSell(
      { previewSteps },
      plan,
      BOUGHT,
      INTERMEDIARY,
    );

    expect(quote.networkFee).toBeUndefined();
    expect(quote.minimumReceive).toBe('9950000');
  });
});

describe('sell plan typing', () => {
  it('carries the sold mint as its params', () => {
    const plan: StepsPlan<SolanaSellParams> = buildSolanaSellPlan({
      token: BUY_TOKENS[1]!,
      amount: '1',
    });

    expect(plan.params.mint).toBe(BUY_TOKENS[1]!.mint);
    expect(plan.recipe.id).toBe(
      `solana-sell-${BUY_TOKENS[1]!.symbol.toLowerCase()}`,
    );
  });
});
