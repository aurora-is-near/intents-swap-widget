import { useMemo } from 'react';

import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { useUnsafeSnapshot } from '@/machine/snap';

import { useTokenInputBalance } from './hooks';
import { TokenInputEmpty } from './TokenInputEmpty';
import { TokenInputWithToken } from './TokenInput';
import type { Msg, Props as TokenInputProps } from './TokenInput';

export type Props = {
  heading: string;
  isChanging?: boolean;
  showBalance?: boolean;
  state?: TokenInputProps['state'];
  onMsg: (msg: Msg) => void;
};

export const TokenInputSource = ({
  onMsg,
  state,
  isChanging = true,
  showBalance = true,
  heading,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const sourceTokenBalance = useTokenInputBalance(ctx.sourceToken);

  const sourceInputState = useMemo(() => {
    if (!isChanging && ctx.quoteStatus === 'pending') {
      return 'disabled' as const;
    }

    if (!ctx.error) {
      return 'default' as const;
    }

    if (ctx.error.code === 'QUOTE_AMOUNT_IS_TOO_LOW') {
      return 'error' as const;
    }

    if (ctx.error.code === 'SOURCE_BALANCE_INSUFFICIENT') {
      return 'error-balance' as const;
    }
  }, [isChanging, ctx.error, ctx.quoteStatus]);

  if (!ctx.sourceToken) {
    return <TokenInputEmpty heading={heading} onMsg={onMsg} />;
  }

  return (
    <TokenInputWithToken
      heading={heading}
      token={ctx.sourceToken}
      state={state ?? sourceInputState}
      balance={sourceTokenBalance}
      showBalance={showBalance}
      showQuickBalanceActions
      value={formatBigToHuman(ctx.sourceTokenAmount, ctx.sourceToken?.decimals)}
      onMsg={onMsg}
    />
  );
};
