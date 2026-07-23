import { useMemo } from 'react';

import { useConfig } from '@/config';
import { Notes } from '@/components/Notes';
import { FeeValue } from '@/components/FeeValue';
import { Accordion } from '@/components/Accordion';
import { TinyNumber } from '@/components/TinyNumber';
import { useTypedTranslation } from '@/localisation';
import { useComputedSnapshot, useUnsafeSnapshot } from '@/machine/snap';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { formatTinyNumber } from '@/utils/formatters/formatTinyNumber';
import { formatUsdAmount } from '@/utils/formatters/formatUsdAmount';
import { getAppFeesPercent } from '@/utils/getAppFeesPercent';
import { getAppFeesUsd } from '@/utils/getAppFeesUsd';

export const DepositSummary = () => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { slippageTolerance } = useConfig();

  const feesPercent = getAppFeesPercent(ctx.quote?.appFees);
  const feesUsd = getAppFeesUsd({
    appFees: ctx.quote?.appFees,
    swapType: ctx.quote?.swapType,
    amountInUsd:
      ctx.quote && 'amountInUsd' in ctx.quote
        ? ctx.quote.amountInUsd
        : undefined,
  });

  const {
    isDirectNearTokenWithdrawal,
    isDirectTokenOnNearTransfer,
    isNativeNearDeposit,
  } = useComputedSnapshot();

  const getDepositAmount = () => {
    let amount: string | undefined;

    if (ctx.quote) {
      if (ctx.quote.type !== 'QUOTE_DEPOSIT_ANY_AMOUNT') {
        amount = formatBigToHuman(
          ctx.quote.amountOut,
          ctx.sourceToken.decimals,
        );
      } else if (ctx.quote.type === 'QUOTE_DEPOSIT_ANY_AMOUNT') {
        return `any amount of ${ctx.sourceToken.symbol}`;
      }
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

    if (
      isDirectNearTokenWithdrawal ||
      isDirectTokenOnNearTransfer ||
      isNativeNearDeposit
    ) {
      return '1 sec.';
    }

    return '—';
  };

  const price =
    ctx.sourceToken &&
    ctx.targetToken &&
    ctx.sourceToken.price / ctx.targetToken.price;

  const detailsTitle = (() => {
    if (
      !ctx.quote ||
      !ctx.sourceToken ||
      !ctx.targetToken ||
      ctx.quote.type === 'QUOTE_DEPOSIT_ANY_AMOUNT' ||
      ctx.sourceToken.symbol === ctx.targetToken.symbol
    ) {
      return t('deposit.summary.title', 'Transaction details');
    }

    return ctx.isDepositFromExternalWallet ? (
      <span style={{ borderBottomWidth: '2px', borderStyle: 'dotted' }}>
        {`1 ${ctx.sourceToken.symbol} ≈ `}
        {formatTinyNumber(price ?? 0)} {`${ctx.targetToken.symbol}`}
        <span className="text-sw-gray-50">{` (${formatUsdAmount(ctx.sourceToken.price)})`}</span>
      </span>
    ) : (
      <span style={{ borderBottomWidth: '2px', borderStyle: 'dotted' }}>
        {`${getDepositAmount()} ≈ `}{' '}
        <TinyNumber
          value={ctx.quote.amountOut}
          decimals={ctx.targetToken.decimals}
        />{' '}
        {`${ctx.targetToken.symbol}`}
        <span className="text-sw-gray-50">{` (${formatUsdAmount(parseFloat(ctx.quote.amountOutUsd))})`}</span>
      </span>
    );
  })();

  const accordionHeight = useMemo(() => {
    if (!ctx.walletAddress && !ctx.quote) {
      return 61;
    }

    return 121;
  }, [ctx.walletAddress, ctx.quote, ctx.walletAddress]);

  return (
    <Accordion
      expandedByDefault={false}
      expandedHeightPx={accordionHeight}
      isBadgeLoading={ctx.quoteStatus === 'pending'}
      badge={ctx.quote ? `~ ${ctx.quote.timeEstimate ?? 0} sec` : undefined}
      title={detailsTitle}>
      <Notes>
        <Notes.Item
          label={t('deposit.summary.youWillDeposit.label', 'You will deposit')}
          value={getDepositAmount()}
        />
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
        <Notes.Item
          isLoading={ctx.quoteStatus === 'pending'}
          label={t('quote.result.processingTime.label', 'Processing time')}
          value={getProcessingTime()}
        />
      </Notes>
    </Accordion>
  );
};
