import {
  ArrowDownward,
  Check,
  OpenInNew,
} from '@material-symbols-svg/react-rounded/w700';

import { TokenRow } from './TokenRow';
import { CopyableValue } from './CopyableValue';
import { useSummaryItemsCount } from './useSummaryItemsCount';

import { Notes } from '@/components/Notes';
import { Button } from '@/components/Button';
import { CloseButton } from '@/components/CloseButton';
import { Accordion } from '@/components/Accordion';

import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';
import { formatUsdAmount } from '@/utils/formatters/formatUsdAmount';
import { formatTinyNumber } from '@/utils/formatters/formatTinyNumber';
import { formatBigToHuman } from '@/utils/formatters/formatBigToHuman';
import { useTypedTranslation } from '@/localisation';
import { useHandleKeyDown } from '@/hooks';
import { logger } from '@/logger';

import type { TransferResult } from '@/types/transfer';

const NOTES_ITEM_HEIGHT = 44;

type Msg = { type: 'on_dismiss_success' };

type Props = TransferResult & {
  title: string;
  showTargetToken?: boolean;
  onMsg: (msg: Msg) => void;
};

export const SuccessScreen = ({
  title,
  showTargetToken = true,
  transactionLink,
  onMsg,
  ...transferResult
}: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();

  const isValidState = guardStates(ctx, ['transfer_success']);
  const handleClose = () => onMsg({ type: 'on_dismiss_success' });
  const summaryItemsCount = useSummaryItemsCount(!!transferResult.intent);

  useHandleKeyDown('Escape', handleClose);

  if (!isValidState) {
    logger.warn(
      '[WIDGET] Success screen can be rendered only in transfer_success state',
    );

    return null;
  }

  const sourceAmount = formatBigToHuman(
    ctx.quote?.amountIn ?? ctx.sourceTokenAmount,
    ctx.sourceToken.decimals,
  );

  const targetAmount = formatBigToHuman(
    ctx.quote?.amountOut ?? ctx.targetTokenAmount,
    ctx.targetToken.decimals,
  );

  const sourceAmountUsd = ctx.quote?.amountInUsd
    ? parseFloat(ctx.quote.amountInUsd)
    : ctx.sourceToken.price * parseFloat(sourceAmount);

  const targetAmountUsd = ctx.quote?.amountOutUsd
    ? parseFloat(ctx.quote.amountOutUsd)
    : ctx.targetToken.price * parseFloat(targetAmount);

  const targetTokenUnitPrice = targetAmountUsd / parseFloat(targetAmount);

  const sourceTokenUnitAmount = formatTinyNumber(
    targetTokenUnitPrice / (parseFloat(sourceAmount) / sourceAmountUsd),
  );

  return (
    <div className="flex flex-col gap-sw-2xl w-full">
      <header className="flex items-center gap-sw-lg">
        <div className="flex items-center justify-center p-sw-md bg-sw-status-success rounded-sw-md">
          <Check size={20} className="text-sw-gray-900" />
        </div>
        <span className="text-sw-label-lg text-sw-status-success mr-auto">
          {title}
        </span>
        <CloseButton onClick={handleClose} />
      </header>
      <div className="flex flex-col">
        <TokenRow
          token={ctx.sourceToken}
          amount={sourceAmount}
          amountUsd={sourceAmountUsd}
        />
        {showTargetToken && (
          <>
            <div className="flex items-center justify-center w-full h-[12px] z-1">
              <div className="flex items-center justify-center p-sw-md bg-sw-gray-950 rounded-sw-md w-fit">
                <ArrowDownward size={18} className="text-sw-gray-200" />
              </div>
            </div>
            <TokenRow
              token={ctx.targetToken}
              amount={targetAmount}
              amountUsd={targetAmountUsd}
            />
          </>
        )}
      </div>

      <Accordion
        expandedByDefault={false}
        expandedHeightPx={summaryItemsCount * NOTES_ITEM_HEIGHT}
        title={t('transfer.success.details.label', 'Transaction details')}>
        <Notes>
          {ctx.sourceToken.symbol !== ctx.targetToken.symbol && (
            <Notes.Item
              label={t('transfer.success.details.rate', 'Rate')}
              value={
                <span
                  className="text-sw-gray-50"
                  style={{ borderBottomWidth: '2px', borderStyle: 'dotted' }}>
                  {`1 ${ctx.targetToken.symbol} ≈ `} {sourceTokenUnitAmount}{' '}
                  {`${ctx.sourceToken.symbol}`}
                  <span>{` (${formatUsdAmount(targetTokenUnitPrice)})`}</span>
                </span>
              }
            />
          )}
          {/* send address is missing if target token is on intents */}
          {!!ctx.sendAddress && (
            <Notes.Item
              label={t(
                'transfer.success.details.recipient',
                'Recipient address',
              )}
              value={<CopyableValue value={ctx.sendAddress} />}
            />
          )}
          {!!transferResult.intent && (
            <Notes.Item
              label={t('transfer.success.details.intent', 'Intent hash')}
              value={<CopyableValue value={transferResult.intent} />}
            />
          )}
          <Notes.Item
            label={t('transfer.success.details.hash', 'Transaction hash')}
            value={<CopyableValue value={transferResult.hash} />}
          />
        </Notes>
      </Accordion>

      <div className="flex flex-col gap-sw-lg">
        <Button
          fluid
          size="lg"
          variant="primary"
          iconPosition="tail"
          icon={OpenInNew}
          onClick={() => window.open(transactionLink, '_blank')}>
          {t('transfer.success.action.viewOnExplorer', 'View in explorer')}
        </Button>
        <Button fluid size="lg" variant="outlined" onClick={handleClose}>
          {t('transfer.success.action.backToSwap', 'Back to swap')}
        </Button>
      </div>
    </div>
  );
};
