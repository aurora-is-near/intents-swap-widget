import { MEMO_FREE_SIGNING_STANDARDS, MEMO_MODE_CHAINS } from '@/chains';
import { failGuard } from '@/errors';

/**
 * Stellar 1Click uses a SHARED deposit address, so the per-quote memo is the
 * only thing attributing incoming funds to this execution. It must appear on
 * the payment AND on `deposit/submit` — omitting it on either loses the deposit.
 *
 * Fails CLOSED when the origin chain is unknown AND no memo is present. The
 * caller's inference is lossy (an execution need not echo `quote.originAsset`,
 * and only some wallet standards name their chain), and treating "cannot tell"
 * as "not memo mode" is exactly how a memo-less deposit reaches the shared
 * address. With the origin unresolved, only a present memo or a signing
 * standard that provably cannot originate on a memo-mode chain
 * (`MEMO_FREE_SIGNING_STANDARDS`) may pass.
 */
export const memoPresentForStellar = (
  originChain: string | undefined,
  memo?: string | null,
  signingStandard?: string,
) => {
  if (originChain === undefined) {
    // A memo that IS present is safe whatever the chain turns out to be —
    // this guard only ever catches a MISSING one, so refusing here would
    // block a perfectly fundable deposit.
    if (memo) {
      return;
    }

    if (signingStandard && MEMO_FREE_SIGNING_STANDARDS.has(signingStandard)) {
      return;
    }

    return failGuard(
      'MEMO_REQUIRED',
      `cannot determine the origin chain of this deposit${
        signingStandard ? ` (signing standard: ${signingStandard})` : ''
      }, so a memo requirement cannot be ruled out — pass the origin chain, or deposit through a plan that names it`,
    );
  }

  if (MEMO_MODE_CHAINS.has(originChain) && !memo) {
    failGuard(
      'MEMO_REQUIRED',
      'a Stellar deposit requires quote.depositMemo on both the transfer and deposit/submit',
    );
  }
};
