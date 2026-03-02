import { Token } from '../../types';
import { TokenIcon } from '../../components';
import { Card } from '@/components/Card';
import { CopyButton } from '@/components/CopyButton';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/formatters/formatRelativeTime';
import { TinyNumber } from '@/components/TinyNumber';
import { getTransactionType } from '@/utils/transactions/getTransactionType';
import { getTransactionStatusLabel } from '@/utils/transactions/getTransactionStatusLabel';
import type { Transaction } from '@/types/transaction';

type Props = {
  transaction: Transaction;
  tokens: Token[];
};

export const TransactionCard = ({ transaction: tx, tokens }: Props) => {
  const type = getTransactionType(tx);
  const status = getTransactionStatusLabel(tx.status);
  const time = formatRelativeTime(tx.createdAt);

  const originToken = tokens.find((t) => t.assetId === tx.originAsset);
  const destToken = tokens.find((t) => t.assetId === tx.destinationAsset);

  const isSwap =
    tx.originAsset &&
    tx.destinationAsset &&
    tx.originAsset !== tx.destinationAsset;

  const copyValue = tx.senders?.[0] ?? tx.recipient;

  return (
    <Card padding="none">
      <div className="p-sw-lg flex flex-col gap-x-sw-md">
        {/* Header row */}
        <div className="flex items-center justify-between mb-sw-lg">
          <div className="flex items-center gap-x-sw-sm">
            <span className="text-sw-label-sm text-sw-gray-50">{type}</span>
            {!!copyValue && !copyValue && <CopyButton value={copyValue} />}
          </div>
          <span className="text-sw-label-sm text-sw-gray-400">{time}</span>
        </div>

        {/* Token row + status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-[10px]">
            {!!originToken && (
              <div className="flex items-center gap-x-sw-md">
                <TokenIcon token={originToken} />
                <span className="text-sw-body-sm text-sw-gray-50">
                  <TinyNumber value={tx.amountInFormatted} />{' '}
                  {originToken.symbol}
                </span>
              </div>
            )}

            {!!isSwap && !!destToken && (
              <>
                <span className="text-sw-gray-100 text-sw-body-sm">&rarr;</span>
                <div className="flex items-center gap-x-sw-xs">
                  <TokenIcon token={destToken} />
                  <span className="text-sw-body-sm text-sw-gray-50">
                    <TinyNumber value={tx.amountOutFormatted} />{' '}
                    {destToken.symbol}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Status badge */}
          <div
            className={cn(
              'flex items-center gap-x-sw-sm',
              status.colorClassName,
            )}>
            {status.Icon && (
              <status.Icon className="h-sw-lg w-sw-lg animate-spin" />
            )}
            <span className="text-sw-label-sm">{status.label}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
