import { formatUsdAmount } from '@/utils/formatters/formatUsdAmount';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { formatHumanToBig } from '@/utils/formatters/formatHumanToBig';
import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import { useUnsafeSnapshot } from '@/machine/snap';
import { TinyNumber } from '@/components/TinyNumber';
import { cn } from '@/utils/cn';

import type { Token } from '@/types/token';

type Props = {
  currentToken: Token;
  variant: 'source' | 'target';
  className?: string;
};

export const ImmediatePrice = ({ currentToken, variant, className }: Props) => {
  const { ctx } = useUnsafeSnapshot();

  const oppositeToken =
    variant === 'source' ? ctx.targetToken : ctx.sourceToken;

  if (!oppositeToken || oppositeToken.symbol === currentToken.symbol) {
    return null;
  }

  let oppositeTokenAmount =
    variant === 'source' ? ctx.targetTokenAmount : ctx.sourceTokenAmount;

  oppositeTokenAmount = isNotEmptyAmount(oppositeTokenAmount)
    ? formatBigToHuman(oppositeTokenAmount, oppositeToken.decimals)
    : '1';

  const oppositeAmountNum = parseFloat(oppositeTokenAmount);
  const hasValidPrices = currentToken.price > 0 && oppositeToken.price > 0;
  const hasValidAmount =
    !Number.isNaN(oppositeAmountNum) && Number.isFinite(oppositeAmountNum);

  const currentAmount =
    hasValidPrices && hasValidAmount
      ? oppositeAmountNum * (oppositeToken.price / currentToken.price)
      : 0;

  const currentAmountBig =
    formatHumanToBig(
      currentAmount.toFixed(currentToken.decimals),
      currentToken.decimals,
    ) || '0';

  const usdValue =
    hasValidPrices && hasValidAmount
      ? oppositeAmountNum * oppositeToken.price
      : 0;

  return (
    <div className="flex items-center h-[16px]">
      <span
        className={cn(
          'px-sw-md py-sw-xs bg-sw-gray-900 text-sw-gray-600 rounded-full text-sw-label-sm -mt-[2px] max-h-[21px]',
          className,
        )}>
        {`${oppositeTokenAmount} ${oppositeToken.symbol} ≈ `}{' '}
        <TinyNumber
          value={currentAmountBig}
          decimals={currentToken.decimals}
          options={{ leadingZeros: 1, minZeros: 2, maxNonZeroPartDecimals: 2 }}
        />{' '}
        {currentToken.symbol}
        <span className="text-sw-gray-800">{` (${formatUsdAmount(usdValue)})`}</span>
      </span>
    </div>
  );
};
