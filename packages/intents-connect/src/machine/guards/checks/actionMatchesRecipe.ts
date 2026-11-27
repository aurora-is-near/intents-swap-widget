import type { ActionResolution } from '@/actions/types';
import { failGuard } from '@/errors';
import type { AnyRecipe } from '@/types/recipe';

type RecipeShape = Pick<
  AnyRecipe<unknown>,
  'id' | 'intent' | 'title' | 'flow' | 'type' | 'destination'
>;

/** The asset the resolved body delivers to (or, out-operation, pays from). */
const deliveredAsset = (
  flow: RecipeShape['flow'],
  execution: ActionResolution['execution'],
): string | undefined => {
  if (flow === 'steps-only') {
    return execution.destinationAsset;
  }

  return flow === 'out-operation'
    ? execution.quote?.originAsset
    : execution.quote?.destinationAsset;
};

/** Whether the body has the shape of `flow` (quote, steps-only, out). */
const hasFlowShape = (
  flow: RecipeShape['flow'],
  execution: ActionResolution['execution'],
): boolean => {
  if (flow === 'steps-only') {
    return (
      execution.quote === undefined && execution.destinationAsset !== undefined
    );
  }

  if (flow === 'out-operation') {
    return execution.quote !== undefined && execution.outOperation === true;
  }

  return execution.quote !== undefined && execution.outOperation !== true;
};

/**
 * A hosted action's resolution must be the execution the recipe describes:
 * the runner builds the creation body from the recipe's flow, destination,
 * intent and title, and takes only the steps from the action. A mismatch
 * means the action and the integration drifted apart; submitting the steps
 * anyway could run them against the wrong asset or chain.
 */
export const actionMatchesRecipe = (
  recipe: RecipeShape,
  resolution: ActionResolution,
): void => {
  const { execution } = resolution;
  const named = `action "${resolution.actionId}" v${resolution.version}`;
  const fail = (what: string): never =>
    failGuard(
      'ACTION_MISMATCH',
      `${named} resolved ${what}, but recipe "${recipe.id}" expects otherwise`,
    );

  if (execution.type !== recipe.type) {
    fail(`a ${execution.type} execution`);
  }

  if (!hasFlowShape(recipe.flow, execution)) {
    fail(`a body that is not a ${recipe.flow} execution`);
  }

  const asset = deliveredAsset(recipe.flow, execution);

  if (asset !== recipe.destination.assetId) {
    fail(`asset ${String(asset)} instead of ${recipe.destination.assetId}`);
  }

  if (
    execution.metadata !== undefined &&
    (execution.metadata.intent !== recipe.intent ||
      execution.metadata.title !== recipe.title)
  ) {
    fail(
      `metadata ${JSON.stringify({
        intent: execution.metadata.intent,
        title: execution.metadata.title,
      })}`,
    );
  }
};
