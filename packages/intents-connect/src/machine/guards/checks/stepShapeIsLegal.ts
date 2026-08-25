import { failGuard } from '@/errors';
import {
  type ExecutionType,
  MAX_FUNCTION_SIGNATURE_BYTES,
  MAX_STEPS,
  type Step,
  STEP_KEYS,
} from '@/types/execution';

const ALLOWED_KEYS = new Set<string>(STEP_KEYS);

/**
 * Steps accept only the five documented keys. An unknown key, a differently
 * cased spelling, or a duplicate is a 400 — so it is worth catching locally
 * where the message can name the offending step.
 */
export const stepShapeIsLegal = (steps: Step[], type: ExecutionType) => {
  const max = MAX_STEPS[type];

  if (steps.length > max) {
    failGuard(
      'ILLEGAL_STEP_SHAPE',
      `${type} allows at most ${max} steps, got ${steps.length}`,
    );
  }

  steps.forEach((step, index) => {
    Object.keys(step).forEach((key) => {
      if (!ALLOWED_KEYS.has(key)) {
        failGuard(
          'ILLEGAL_STEP_SHAPE',
          `step ${index}: unknown key "${key}" (allowed: ${STEP_KEYS.join(', ')})`,
        );
      }
    });

    if (typeof step.to !== 'string' || step.to === '') {
      failGuard(
        'ILLEGAL_STEP_SHAPE',
        `step ${index}: "to" must be a non-empty string`,
      );
    }

    if (!Array.isArray(step.parameters)) {
      failGuard(
        'ILLEGAL_STEP_SHAPE',
        `step ${index}: "parameters" must be an array`,
      );
    }

    if (typeof step.value !== 'string') {
      failGuard(
        'ILLEGAL_STEP_SHAPE',
        `step ${index}: "value" must be a string`,
      );
    }

    if (typeof step.functionSignature !== 'string') {
      failGuard(
        'ILLEGAL_STEP_SHAPE',
        `step ${index}: "functionSignature" must be a string (empty for a bare value transfer)`,
      );
    }

    // The limit is bytes, so measure bytes: `.length` counts UTF-16 code units
    // and under-counts multi-byte content, letting an over-limit payload
    // through to a server 400.
    const signatureBytes = new TextEncoder().encode(
      step.functionSignature,
    ).length;

    if (signatureBytes > MAX_FUNCTION_SIGNATURE_BYTES) {
      failGuard(
        'ILLEGAL_STEP_SHAPE',
        `step ${index}: functionSignature exceeds ${MAX_FUNCTION_SIGNATURE_BYTES} bytes`,
      );
    }
  });
};
