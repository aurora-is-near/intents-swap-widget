import type { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';

import { formatUsdAmount } from './formatters/formatUsdAmount';
import { getAppFeesAmount } from './getAppFeesAmount';

export const getAppFeesUsd = ({
  appFees,
  amountInUsd,
  swapType,
}: {
  appFees: readonly { fee: number }[] | undefined;
  amountInUsd: string | undefined;
  swapType: QuoteRequest.swapType | undefined;
}): string | null => {
  const feeUsd = getAppFeesAmount({
    appFees,
    amount: amountInUsd ? parseFloat(amountInUsd) : NaN,
    swapType,
  });

  if (feeUsd === null) {
    return null;
  }

  if (feeUsd < 0.01) {
    return `<${formatUsdAmount(0.01)}`;
  }

  return formatUsdAmount(feeUsd);
};
