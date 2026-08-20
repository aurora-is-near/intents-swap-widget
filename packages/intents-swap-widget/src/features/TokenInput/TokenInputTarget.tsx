import { useMemo } from 'react';

import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';

import { useTokenInputBalance } from './hooks';
import { TokenInputWithToken } from './TokenInput';
import { TokenInputEmpty } from './TokenInputEmpty';
import type { Msg, Props as TokenInputProps } from './TokenInput';

export type Props = {
  heading: string;
  isChanging?: boolean;
  state?: TokenInputProps['state'];
  onMsg: (msg: Msg) => void;
};

export const TokenInputTarget = ({
  state,
  heading,
  isChanging = false,
  onMsg,
}: Props) => {
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
    return <TokenInputEmpty heading={heading} onMsg={onMsg} />;
  }

  return (
    <TokenInputWithToken
      heading={heading}
      token={ctx.targetToken}
      balance={targetTokenBalance}
      quoteUsdDelta={usdTradeDelta?.percentage}
      quoteUsdValue={
        ctx.quote && ctx.quote.type !== 'QUOTE_DEPOSIT_ANY_AMOUNT'
          ? parseFloat(ctx.quote.amountOutUsd)
          : undefined
      }
      value={formatBigToHuman(ctx.targetTokenAmount, ctx.targetToken?.decimals)}
      state={state ?? sourceInputState}
      showQuickBalanceActions={false}
      showBalance={true}
      onMsg={onMsg}
    />
  );
};
