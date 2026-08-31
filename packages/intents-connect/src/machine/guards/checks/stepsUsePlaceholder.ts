import {
  BACKEND_PLACEHOLDERS,
  type Step,
  type StepParameter,
} from '@/types/execution';

const PLACEHOLDER = BACKEND_PLACEHOLDERS.minAmountOut;

const parameterUsesPlaceholder = (parameter: StepParameter): boolean =>
  Array.isArray(parameter)
    ? parameter.some(parameterUsesPlaceholder)
    : parameter.includes(PLACEHOLDER);

/**
 * True when the steps embed `{MIN_AMOUNT_OUT}` in a field the backend
 * substitutes — `to`, `value` or `parameters`. `metadata` and
 * `functionSignature` are deliberately not scanned: the backend passes them
 * through untouched, so placeholder-looking text there is inert and must not
 * trip the strategy-conflict guard.
 */
export const stepsUsePlaceholder = (steps: Step[]): boolean =>
  steps.some(
    (step) =>
      step.to.includes(PLACEHOLDER) ||
      step.value.includes(PLACEHOLDER) ||
      step.parameters.some(parameterUsesPlaceholder),
  );
