import { useTokens } from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import { getIntentsTargetToken } from '@aurora-is-near/intents-swap-widget/utils';

import { DEPOSIT_SYMBOL } from '../config';

/**
 * The intents token deposits land as. A persistent deposit address converts
 * everything to one asset, so this is the widget's deposit mapping applied to
 * that asset: its single representation, on NEAR.
 */
export const useDepositDestination = (): Token | undefined => {
  const { tokens } = useTokens();

  return getIntentsTargetToken(
    // No source asset: any deposit is converted to this symbol.
    { assetId: '', symbol: DEPOSIT_SYMBOL },
    tokens,
  );
};
