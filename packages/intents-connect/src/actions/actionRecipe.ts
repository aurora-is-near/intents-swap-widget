import type { IntentsConnectActionsApi } from '@/actions/types';
import { actionMatchesRecipe } from '@/machine/guards';
import type { Step } from '@/types/execution';
import type { AsyncRecipe, Recipe, StepContext } from '@/types/recipe';

export type ActionRecipeOptions<TParams> = Omit<
  Recipe<TParams>,
  'buildSteps' | 'type'
> & {
  /** The actions API client (`createIntentsConnectActionsApi`). */
  api: Pick<IntentsConnectActionsApi, 'resolveAction'>;
  /** The hosted action's id, e.g. `aave-v3-borrow`. */
  actionId: string;
  version: number;
  /**
   * Pins the definition and script the integration was built against: a
   * changed action fails with `IntentsConnectActionsApiError.isHashMismatch`
   * instead of running steps nobody reviewed, and a resolution carrying
   * another hash or version fails with `ACTION_MISMATCH`.
   */
  expectedSha256Hash?: string;
  /**
   * The action's inputs for one build. `ctx.amount` is opaque on EVM (it may
   * be `{MIN_AMOUNT_OUT}`) and changes between builds of one steps-only
   * preview, so map it through rather than fixing it at recipe creation.
   */
  inputs: (ctx: StepContext, params: TParams) => Record<string, unknown>;
};

/**
 * An EVM recipe whose steps come from a hosted action: each `buildSteps`
 * resolves the action with the inputs `inputs(ctx, params)` returns and
 * returns the resolved steps. The runner builds the creation body as for any
 * recipe (quote, metadata, fee handling), so the recipe's static fields must
 * describe what the action resolves to; `actionMatchesRecipe` checks that on
 * every build and throws `ACTION_MISMATCH` otherwise.
 */
export const actionRecipe = <TParams>({
  api,
  actionId,
  version,
  expectedSha256Hash,
  inputs,
  ...recipe
}: ActionRecipeOptions<TParams>): AsyncRecipe<TParams> => {
  const shape = { ...recipe, type: 'evm' as const };

  return {
    ...shape,
    buildSteps: async (ctx, params) => {
      const resolution = await api.resolveAction(actionId, {
        version,
        expectedSha256Hash,
        inputs: inputs(ctx, params),
      });

      actionMatchesRecipe(shape, { version, expectedSha256Hash }, resolution);

      // An `evm` execution carries EVM steps; the runner's step guards
      // (`validateSteps`) check their shape next.
      return resolution.execution.steps as Step[];
    },
  };
};
