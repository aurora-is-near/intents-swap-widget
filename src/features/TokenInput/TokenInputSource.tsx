import { useMemo } from 'react';

import { useUnsafeSnapshot } from '@/machine/snap';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';
import { useMergedBalance } from '@/hooks/useMergedBalance';

import { Msg, TokenInputWithToken } from './TokenInput';
import { TokenInputEmpty } from './TokenInputEmpty';

export type Props = {
  onMsg: (msg: Msg) => void;
};

export const TokenInputSource = ({ onMsg }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { mergedBalance } = useMergedBalance();

  const sourceTokenBalance = ctx.sourceToken
    ? mergedBalance[getTokenBalanceKey(ctx.sourceToken)]
    : undefined;

  const sourceInputState = useMemo(() => {
    if (!ctx.error) {
      return 'default' as const;
    }

    if (ctx.error.code === 'QUOTE_AMOUNT_IS_TOO_LOW') {
      return 'error' as const;
    }

    if (ctx.error.code === 'SOURCE_BALANCE_INSUFFICIENT') {
      return 'error-balance' as const;
    }
  }, [ctx.error]);

  if (!ctx.sourceToken) {
    return <TokenInputEmpty onMsg={onMsg} />;
  }

  return (
    <TokenInputWithToken
      token={ctx.sourceToken}
      balance={sourceTokenBalance}
      state={sourceInputState}
      showQuickBalanceActions
      value={formatBigToHuman(ctx.sourceTokenAmount, ctx.sourceToken?.decimals)}
      onMsg={onMsg}
    />
  );
};
