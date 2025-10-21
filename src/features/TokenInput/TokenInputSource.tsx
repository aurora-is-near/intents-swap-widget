import { useMemo } from 'react';

import { useUnsafeSnapshot } from '@/machine/snap';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';

import { Msg, TokenInputWithToken } from './TokenInput';
import { TokenInputEmpty } from './TokenInputEmpty';
import { useTokenInputBalance } from './hooks';
import { useDefaultToken } from '../../hooks/useDefaultToken';

export type Props = {
  isChanging?: boolean;
  showBalance?: boolean;
  onMsg: (msg: Msg) => void;
};

export const TokenInputSource = ({
  onMsg,
  isChanging = true,
  showBalance = true,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const sourceTokenBalance = useTokenInputBalance(ctx.sourceToken);

  useDefaultToken('source', onMsg);

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
    return <TokenInputEmpty onMsg={onMsg} />;
  }

  return (
    <TokenInputWithToken
      token={ctx.sourceToken}
      state={sourceInputState}
      balance={sourceTokenBalance}
      showBalance={showBalance}
      showQuickBalanceActions
      value={formatBigToHuman(ctx.sourceTokenAmount, ctx.sourceToken?.decimals)}
      onMsg={onMsg}
    />
  );
};
