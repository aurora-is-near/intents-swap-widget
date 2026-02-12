import { useMemo } from 'react';

import { Msg, TokenInputWithToken } from './TokenInput';
import { TokenInputEmpty } from './TokenInputEmpty';
import { useTokenInputBalance } from './hooks';
import { useConfig } from '../../config';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';

export type Props = {
  isChanging?: boolean;
  onMsg: (msg: Msg) => void;
  heading: string;
};

export const TokenInputTarget = ({
  isChanging = false,
  onMsg,
  heading,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { disableTokenSelection } = useConfig();
  const { usdTradeDelta } = useComputedSnapshot();
  const targetTokenBalance = useTokenInputBalance(ctx.targetToken);

  const sourceInputState = useMemo(() => {
    if (disableTokenSelection) {
      return 'disabled' as const;
    }

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
      quoteUsdValue={ctx.quote && parseFloat(ctx.quote.amountOutUsd)}
      value={formatBigToHuman(ctx.targetTokenAmount, ctx.targetToken?.decimals)}
      state={sourceInputState}
      showQuickBalanceActions={false}
      showBalance={true}
      onMsg={onMsg}
    />
  );
};
