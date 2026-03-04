import { Token } from '../../types';
import { TokenIcon } from '../../components';
import { TransactionStatusBadge } from './TransactionStatusBadge';
import { Card } from '@/components/Card';
import { CopyButton } from '@/components/CopyButton';
import { formatRelativeTime } from '@/utils/formatters/formatRelativeTime';
import { TinyNumber } from '@/components/TinyNumber';
import { getTransactionType } from '@/utils/transactions/getTransactionType';
import { getTransactionStatusLabel } from '@/utils/transactions/getTransactionStatusLabel';
import type { Transaction } from '@/types/transaction';

type Props = {
  transaction: Transaction;
  tokens: Token[];
  onClick: () => void;
};

export const TransactionCard = ({
  transaction: tx,
  tokens,
  onClick,
}: Props) => {
  const type = getTransactionType(tx, tokens);
  const status = getTransactionStatusLabel(tx.status);
  const time = formatRelativeTime(tx.createdAt);

  const originToken = tokens.find((t) => t.assetId === tx.originAsset);
  const destToken = tokens.find((t) => t.assetId === tx.destinationAsset);

  const isSwap = type === 'Swap';

  const copyValue = tx.senders?.[0] ?? tx.recipient;

  return (
    <Card
      isClickable
      padding="none"
      onClick={onClick}
      className="hover:bg-sw-gray-800 group">
      <div className="p-sw-xl flex flex-col gap-x-sw-md">
        {/* Header row */}
        <div className="flex items-center justify-between mb-sw-lg">
          <div className="flex items-center gap-x-sw-sm">
            <span className="text-sw-label-md text-sw-gray-200">{type}</span>
            {!!copyValue && !isSwap && <CopyButton value={copyValue} />}
          </div>
          <span className="text-sw-label-sm text-sw-gray-400">{time}</span>
        </div>

        {/* Token row + status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-[10px]">
            {!!originToken && (
              <div className="flex items-center gap-x-sw-md">
                <TokenIcon
                  token={originToken}
                  className="border-sw-gray-900 group-hover:border-sw-gray-800 transition-colors"
                />
                <span className="text-sw-label-md text-sw-gray-50">
                  <TinyNumber value={tx.amountInFormatted} />{' '}
                  {originToken.symbol}
                </span>
              </div>
            )}

            {!!isSwap && !!destToken && (
              <>
                <span className="text-sw-gray-200 text-sw-label-md">
                  &rarr;
                </span>
                <div className="flex items-center gap-x-sw-md">
                  <TokenIcon token={destToken} />
                  <span className="text-sw-label-md text-sw-gray-50">
                    <TinyNumber value={tx.amountOutFormatted} />{' '}
                    {destToken.symbol}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Status badge */}
          <TransactionStatusBadge status={status} />
        </div>
      </div>
    </Card>
  );
};
