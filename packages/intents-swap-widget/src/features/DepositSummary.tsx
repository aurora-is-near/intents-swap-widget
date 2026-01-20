import { useConfig } from '@/config';
import { Card } from '@/components/Card';
import { Notes } from '@/components/Notes';
import { useTypedTranslation } from '@/localisation';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';

export const DepositSummary = () => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { slippageTolerance } = useConfig();
  const { isDirectNearTokenWithdrawal } = useComputedSnapshot();

  const getDepositAmount = () => {
    let amount: string | undefined;

    if (ctx.quote) {
      amount = formatBigToHuman(ctx.quote.amountOut, ctx.sourceToken.decimals);
    }

    if (!ctx.sourceTokenAmount || ctx.sourceTokenAmount === '0') {
      amount = '0';
    }

    if (ctx.sourceToken) {
      amount = formatBigToHuman(
        ctx.sourceTokenAmount,
        ctx.sourceToken.decimals,
      );
    }

    if (amount && ctx.sourceToken) {
      return `${amount} ${ctx.sourceToken.symbol}`;
    }

    return '—';
  };

  const getProcessingTime = () => {
    if (ctx.quote) {
      return `${ctx.quote.timeEstimate} sec.`;
    }

    if (isDirectNearTokenWithdrawal) {
      return '1 sec.';
    }

    return '—';
  };

  return (
    <Card className="flex flex-col gap-sw-2xl">
      <span className="text-sw-label-md text-sw-gray-50">
        {t('deposit.summary.title', 'Summary')}
      </span>
      <Notes>
        <Notes.Item
          label={t('deposit.summary.youWillDeposit.label', 'You will deposit')}
          value={getDepositAmount()}
        />
        <Notes.Item
          label={t('quote.result.maxSlippage.label', 'Max slippage')}
          value={`${(slippageTolerance / 100).toFixed(2)}%`}
        />
        <Notes.Item
          isLoading={ctx.quoteStatus === 'pending'}
          label={t('quote.result.processingTime.label', 'Processing time')}
          value={getProcessingTime()}
        />
      </Notes>
    </Card>
  );
};
