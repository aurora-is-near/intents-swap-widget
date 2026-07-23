import { useMemo } from 'react';
import { useConfig } from '@/config';
import { useUnsafeSnapshot } from '@/machine/snap';

import { Notes } from '@/components/Notes';
import { FeeValue } from '@/components/FeeValue';
import { Accordion } from '@/components/Accordion';
import { formatUsdAmount } from '@/utils/formatters/formatUsdAmount';
import { formatTinyNumber } from '@/utils/formatters/formatTinyNumber';
import { getAppFeesPercent } from '@/utils/getAppFeesPercent';
import { getAppFeesUsd } from '@/utils/getAppFeesUsd';
import { useTypedTranslation } from '@/localisation';
import { SwapQuoteSkeleton } from './SwapQuoteSkeleton';

type Props = {
  className?: string;
};

export const SwapQuote = ({ className }: Props) => {
  const { t } = useTypedTranslation();
  const { slippageTolerance } = useConfig();
  const { ctx } = useUnsafeSnapshot();

  const feesPercent = getAppFeesPercent(ctx.quote?.appFees);
  const feesUsd = getAppFeesUsd({
    appFees: ctx.quote?.appFees,
    swapType: ctx.quote?.swapType,
    amountInUsd:
      ctx.quote && 'amountInUsd' in ctx.quote
        ? ctx.quote.amountInUsd
        : undefined,
  });

  const price =
    ctx.sourceToken &&
    ctx.targetToken &&
    ctx.sourceToken.price / ctx.targetToken.price;

  if (!ctx.sourceToken) {
    return <SwapQuoteSkeleton />;
  }

  const accordionHeight = useMemo(() => {
    if (!ctx.walletAddress && !ctx.quote) {
      return 61;
    }

    if (!ctx.walletAddress && ctx.quote) {
      return 91;
    }

    return 121;
  }, [ctx.walletAddress, ctx.quote, ctx.walletAddress]);

  return (
    <Accordion
      expandedByDefault={false}
      expandedHeightPx={accordionHeight}
      isBadgeLoading={ctx.quoteStatus === 'pending'}
      badge={ctx.quote ? `~ ${ctx.quote.timeEstimate} sec` : undefined}
      className={className}
      title={
        ctx.sourceToken && ctx.targetToken ? (
          <span style={{ borderBottomWidth: '2px', borderStyle: 'dotted' }}>
            {`1 ${ctx.sourceToken.symbol} ≈ `} {formatTinyNumber(price ?? 0)}{' '}
            {`${ctx.targetToken.symbol}`}
            <span className="text-sw-gray-50">{` (${formatUsdAmount(ctx.sourceToken.price)})`}</span>
          </span>
        ) : (
          <span style={{ borderBottomWidth: '2px', borderStyle: 'dotted' }}>
            {`1 ${ctx.sourceToken.symbol} ≈ `}{' '}
            {formatUsdAmount(ctx.sourceToken.price)} USD
          </span>
        )
      }>
      <Notes>
        <Notes.Item
          label={t('quote.result.maxSlippage.label', 'Max slippage')}
          value={`${(slippageTolerance / 100).toFixed(2)}%`}
        />
        {!!feesPercent && (
          <Notes.Item
            label={t('quote.result.fees.label', 'Fees')}
            value={<FeeValue feesPercent={feesPercent} feesUsd={feesUsd} />}
          />
        )}
        {!!ctx.walletAddress && (
          <Notes.Item
            isLoading={ctx.quoteStatus === 'pending'}
            label={t('quote.result.processingTime.label', 'Processing time')}
            value={ctx.quote ? `${ctx.quote.timeEstimate} sec.` : '—'}
          />
        )}
      </Notes>
    </Accordion>
  );
};
