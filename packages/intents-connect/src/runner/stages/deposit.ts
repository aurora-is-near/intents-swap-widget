import { parseOriginAsset, SIGNING_STANDARD_CHAINS } from '@/chains';
import { DepositTransferError, toError } from '@/errors';
import * as guards from '@/machine/guards';
import type { Execution } from '@/types/execution';
import type { RunnerCtx } from '@/runner/ctx';
import type { DepositPlan } from '@/runner/depositPlan';
import { requireTransfer } from '@/runner/transfer';

export const exposeDepositAddress = (
  ctx: RunnerCtx,
  execution: Execution,
  deadline?: string,
  /**
   * The origin chain when the caller holds an authoritative one (a plan);
   * otherwise it is derived from the execution itself, falling back to the
   * `SIGNING_STANDARD_CHAINS` inference when the execution does not name its
   * origin.
   */
  originChainHint?: string,
) => {
  const { to, patch, emit, machine, getWallet } = ctx;

  // The memo guard lives HERE, at the one choke point where the shared
  // deposit address is surfaced: a memo-mode deposit without its memo is
  // unattributable — lost, not just failed — so no caller may reach the
  // address without passing it.
  //
  // An unresolved origin is handed to the guard rather than skipping it: the
  // inference below is lossy, and "cannot tell" must fail closed.
  const namedOrigin =
    originChainHint ??
    (execution.quote.originAsset
      ? parseOriginAsset(execution.quote.originAsset)?.chain
      : undefined);

  // The wallet is consulted ONLY when the execution did not name its origin.
  // A QR / exchange deposit never touches the wallet after signing, so it must
  // still be able to surface its address once the wallet is disconnected or
  // switched — which is exactly when this accessor throws.
  const signingStandard = namedOrigin ? undefined : getWallet().signingStandard;

  const originChain =
    namedOrigin ??
    (signingStandard ? SIGNING_STANDARD_CHAINS[signingStandard] : undefined);

  guards.memoPresentForStellar(
    originChain,
    execution.quote.depositMemo,
    signingStandard,
  );

  to('awaiting-deposit');

  guards.mustBeSignedBeforeDeposit(machine.context.hasSubmittedSignature);

  const { depositAddress, depositMemo } = execution.quote;
  const validUntil = deadline ?? execution.quote.deadline;

  patch({ depositAddress, depositMemo, deadline: validUntil });

  emit({
    type: 'deposit-address',
    address: depositAddress,
    memo: depositMemo,
    deadline: validUntil,
  });

  return { depositAddress, depositMemo };
};

export const awaitDeposit = async (
  ctx: RunnerCtx,
  plan: DepositPlan,
  execution: Execution,
) => {
  const { api, logger, state, patch, emit, assertLive } = ctx;

  const { depositAddress, depositMemo } = exposeDepositAddress(
    ctx,
    execution,
    plan.quote.deadline,
    plan.originChain,
  );

  // QR / exchange path: the sender is not our wallet, so there is no tx hash
  // to record. The backend's deposit watcher observes settlement instead.
  if (!plan.depositViaWallet) {
    return;
  }

  // A cancel() or dispose() that landed while the earlier stages ran must
  // stop the flow BEFORE the wallet is asked to move funds.
  assertLive(execution.id);

  // EXACT_INPUT sends quote.amount verbatim; EXACT_OUTPUT sends the service's
  // computed origin commitment. Never recompute it.
  const amountAtomic =
    plan.quote.swapType === 'EXACT_OUTPUT'
      ? execution.quote.amountIn
      : execution.quote.amount;

  const transfer = requireTransfer(ctx, plan.originChain);

  let hash: string;

  try {
    ({ hash } = await transfer({
      amountAtomic,
      // Duplicated on the widget-compat alias: the widget's network plugins
      // read `args.amount` (already atomic there) and never look at
      // `amountAtomic`, so omitting it would crash every plugin deposit.
      amount: amountAtomic,
      decimals: plan.originToken.decimals,
      address: depositAddress,
      tokenAddress: plan.originToken.contractAddress,
      chain: plan.originChain,
      evmChainId: plan.originChainId ?? null,
      isNativeEvmTokenTransfer: !plan.originToken.contractAddress,
      memo: depositMemo ?? undefined,
    }));
  } catch (error) {
    // A rejected wallet prompt is the single most common event at this
    // stage, and the execution is still valid and signed server-side — so
    // this is a retryable pause (`retryDeposit()`), not a terminal failure.
    throw new DepositTransferError(execution.id, { cause: toError(error) });
  }

  // Recorded on `state`, which survives the machine reset a later resume()
  // performs — the context's `depositTxHash` does not, and a resume that
  // forgot this would prompt a second transfer for funds already sent.
  //
  // BEFORE the liveness checkpoint below, and unconditionally: a broadcast tx
  // cannot be un-sent, so it must be remembered even when the flow is about to
  // die — that is precisely when a resume() would otherwise re-prompt for it.
  state.depositSentExecutionIds.add(execution.id);

  // Re-checked AFTER the prompt, not only before it — the same checkpoint
  // signAndSubmit places once its own prompt returns. A cancel() that landed
  // while the transfer sat open has already DELETED the execution and wiped
  // exactly the fields written below, so recording the hash would resurrect a
  // cancelled execution as one holding a live deposit; a dispose() has rebound
  // the runner's owner, whose onEvent this is no longer. The funds are gone
  // either way, so the hash is logged rather than swallowed.
  try {
    assertLive(execution.id);
  } catch (error) {
    logger.warn(
      `deposit ${hash} for execution ${execution.id} was broadcast after the execution was cancelled or the runner was disposed — the funds were sent but are not recorded server-side`,
    );

    throw error;
  }

  patch({ depositTxHash: hash });
  emit({ type: 'deposit-sent', txHash: hash });

  // Best-effort: notifies 1Click without waiting for the watcher.
  try {
    await api.recordDeposit({
      txHash: hash,
      depositAddress,
      ...(depositMemo ? { memo: depositMemo } : {}),
    });
  } catch (error) {
    logger.warn('failed to record the deposit (non-fatal)', error);
  }
};
