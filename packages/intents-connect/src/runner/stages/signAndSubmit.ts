import * as guards from '@/machine/guards';
import { signIntentsConnectPayload } from '@/signers/intentsConnect';
import type { Execution } from '@/types/execution';
import type { SignatureEnvelope, SigningStandard } from '@/types/signing';
import type { RunnerCtx } from '@/runner/ctx';

/**
 * Returns the standard alongside the envelope. The caller has to validate the
 * envelope against the standard it was actually signed with — which comes from
 * the execution, not from what the connector claims to be.
 */
const signPayload = async (
  ctx: RunnerCtx,
  execution: Execution,
): Promise<{ envelope: SignatureEnvelope; standard: SigningStandard }> => {
  const { payload, standard } = guards.mustHaveSigningPayload(execution);
  const activeWallet = ctx.getWallet();

  const envelope = await signIntentsConnectPayload({
    payload,
    standard,
    address: ctx.requireAddress(),
    providers: activeWallet.getProviders(),
    // Bound to the connector so a class-based implementation keeps its `this`
    // when the sep53 signer invokes it bare.
    decodePublicKey: activeWallet.decodePublicKey?.bind(activeWallet),
  });

  return { envelope, standard };
};

export const signAndSubmit = async (
  ctx: RunnerCtx,
  execution: Execution,
): Promise<boolean> => {
  const { api, requireAddress, to, patch, assertLive } = ctx;

  to('awaiting-signature');

  const { envelope, standard } = await signPayload(ctx, execution);

  // The wallet prompt can sit open across a cancel() or a dispose(); a
  // signature approved after either must not be submitted.
  assertLive(execution.id);

  // Checked against the execution's standard, not the connector's: the
  // envelope was produced from the former, and a disagreement between the two
  // is itself the fault to report rather than a publicKey mismatch.
  guards.publicKeyMatchesStandard(standard, envelope.publicKey);

  to('submitting');

  const { status } = await api.submitSignature(requireAddress(), {
    ...envelope,
    executionId: execution.id,
  });

  patch({ hasSubmittedSignature: true });

  // Out-operations answer SIGNING — already OPERATION_PENDING, nothing to
  // deposit. v1 only creates bridge-ins, but the branch is real.
  return status !== 'SIGNING';
};
