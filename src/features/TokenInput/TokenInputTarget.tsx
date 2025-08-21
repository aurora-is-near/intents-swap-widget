import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';
import { useMergedBalance } from '@/hooks/useMergedBalance';

import { Msg, TokenInputWithToken } from './TokenInput';
import { TokenInputEmpty } from './TokenInputEmpty';

export type Props = {
  onMsg: (msg: Msg) => void;
};

export const TokenInputTarget = ({ onMsg }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { usdTradeDelta } = useComputedSnapshot();
  const { mergedBalance } = useMergedBalance();

  const targetTokenBalance = ctx.targetToken
    ? mergedBalance[getTokenBalanceKey(ctx.targetToken)]
    : undefined;

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
      state={ctx.quoteStatus === 'pending' ? 'disabled' : 'default'}
      showQuickBalanceActions={false}
      onMsg={onMsg}
    />
  );
};
