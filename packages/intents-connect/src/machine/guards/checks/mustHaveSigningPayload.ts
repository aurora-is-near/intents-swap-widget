import { failGuard } from '@/errors';
import type { Execution } from '@/types/execution';
import type { SigningPayload, SigningStandard } from '@/types/signing';

/** A created execution without a signing payload cannot be progressed. */
export const mustHaveSigningPayload = (
  execution: Execution,
): { payload: SigningPayload; standard: SigningStandard } => {
  const { payload, signingStandard } = execution.details;

  if (!payload || !signingStandard) {
    return failGuard(
      'NO_SIGNING_PAYLOAD',
      'execution returned no signing payload — fee estimation likely failed',
    );
  }

  return { payload, standard: signingStandard };
};
