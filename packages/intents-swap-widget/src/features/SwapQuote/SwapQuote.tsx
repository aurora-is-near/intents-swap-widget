import { SwapQuoteSkeleton } from './SwapQuoteSkeleton';
import { useConfig } from '@/config';
import { useUnsafeSnapshot } from '@/machine/snap';

import { Notes } from '@/components/Notes';
import { Accordion } from '@/components/Accordion';
import { formatUsdAmount } from '@/utils/formatters/formatUsdAmount';
import { formatTinyNumber } from '@/utils/formatters/formatTinyNumber';
import { useTypedTranslation } from '@/localisation';

type Props = {
  className?: string;
};

export const SwapQuote = ({ className }: Props) => {
  const { t } = useTypedTranslation();
  const { defaultMaxSlippage } = useConfig();
  const { ctx } = useUnsafeSnapshot();

  const price =
    ctx.sourceToken &&
    ctx.targetToken &&
    ctx.sourceToken.price / ctx.targetToken.price;

  if (!ctx.sourceToken) {
    return <SwapQuoteSkeleton />;
  }

  return (
    <Accordion
      expandedByDefault={false}
      expandedHeightPx={ctx.walletAddress ? 80 : 50}
      isBadgeLoading={ctx.quoteStatus === 'pending'}
      badge={ctx.quote ? `~ ${ctx.quote.timeEstimate} sec` : undefined}
      className={className}
      title={
        ctx.sourceToken && ctx.targetToken ? (
          <>
            {`1 ${ctx.sourceToken.symbol} ≈ `} {formatTinyNumber(price ?? 0)}{' '}
            {`${ctx.targetToken.symbol}`}
            <span className="text-sw-gray-50">{`(${formatUsdAmount(ctx.sourceToken.price)})`}</span>
          </>
        ) : (
          <>
            {`1 ${ctx.sourceToken.symbol} ≈ `}{' '}
            {formatUsdAmount(ctx.sourceToken.price)} USD
          </>
        )
      }>
      <Notes>
        <Notes.Item
          label={t('quote.result.maxSlippage.label', 'Max slippage')}
          value={`${(defaultMaxSlippage * 100).toFixed(2)}%`}
        />
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
