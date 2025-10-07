import { useMemo } from 'react';

import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';

import { Msg, TokenInputWithToken } from './TokenInput';
import { TokenInputEmpty } from './TokenInputEmpty';
import { useTokenInputBalance } from './hooks';

export type Props = {
  isChanging?: boolean;
  onMsg: (msg: Msg) => void;
};

export const TokenInputTarget = ({ isChanging = false, onMsg }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { usdTradeDelta } = useComputedSnapshot();
  const targetTokenBalance = useTokenInputBalance(ctx.targetToken);

  const sourceInputState = useMemo(() => {
    if (!isChanging && ctx.quoteStatus === 'pending') {
      return 'disabled' as const;
    }

    return 'default' as const;
  }, [isChanging, ctx.quoteStatus]);

  if (!ctx.targetToken) {
    return <TokenInputEmpty onMsg={onMsg} />;
  }

  return (
    <TokenInputWithToken
      token={ctx.targetToken}
      balance={targetTokenBalance}
      quoteUsdDelta={usdTradeDelta?.percentage}
      quoteUsdValue={ctx.quote && parseFloat(ctx.quote.amountOutUsd)}
      value={formatBigToHuman(ctx.targetTokenAmount, ctx.targetToken?.decimals)}
      state={sourceInputState}
      showQuickBalanceActions={false}
      showBalance={true}
      onMsg={onMsg}
    />
  );
};
