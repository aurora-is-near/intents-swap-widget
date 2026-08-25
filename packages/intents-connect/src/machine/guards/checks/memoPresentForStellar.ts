import { failGuard } from '@/errors';

const MEMO_MODE_CHAINS = new Set(['stellar']);

/**
 * Stellar 1Click uses a SHARED deposit address, so the per-quote memo is the
 * only thing attributing incoming funds to this execution. It must appear on
 * the payment AND on `deposit/submit` — omitting it on either loses the deposit.
 */
export const memoPresentForStellar = (
  originChain: string,
  memo?: string | null,
) => {
  if (MEMO_MODE_CHAINS.has(originChain) && !memo) {
    failGuard(
      'MEMO_REQUIRED',
      'a Stellar deposit requires quote.depositMemo on both the transfer and deposit/submit',
    );
  }
};
