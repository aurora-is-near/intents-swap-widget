import { failGuard } from '@/errors';
import type { FlowShape } from '@/types/execution';

/**
 * `quote.recipient` is out-operation only. On a bridge-in the recipient is
 * always the intermediary, and sending one is a 400.
 *
 * v1 implements `bridge-in` only, so any recipient is rejected. The `flow`
 * argument is threaded through now so that adding `out-operation` to
 * `FlowShape` turns this into a real branch rather than a signature change at
 * every call site.
 */
export const recipientOnlyOnOutOperation = (
  flow: FlowShape,
  recipient?: string,
) => {
  if (recipient && flow === 'bridge-in') {
    failGuard(
      'RECIPIENT_NOT_ALLOWED',
      'quote.recipient is only valid for out-operations',
    );
  }
};
