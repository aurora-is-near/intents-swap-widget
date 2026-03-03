import { type PropsWithChildren } from 'react';
import { OpenInNewW700 as OpenInNew } from '@material-symbols-svg/react-rounded/icons/open-in-new';
import { ArrowDownwardW700 as ArrowDownward } from '@material-symbols-svg/react-rounded/icons/arrow-downward';

import { TransactionDetailsToken } from './TransactionDetailsToken';
import { TransactionStatusBadge } from './TransactionStatusBadge';
import { Card } from '@/components/Card';
import { CloseButton } from '@/components/CloseButton';
import { TinyNumber } from '@/components/TinyNumber';
import { CopyButton } from '@/components/CopyButton';
import { Hr } from '@/components/Hr';
import { formatUsdAmount } from '@/utils/formatters/formatUsdAmount';
import { formatAddressTruncate } from '@/utils/formatters/formatAddressTruncate';
import { getTransactionType } from '@/utils/transactions/getTransactionType';
import { getTransactionStatusLabel } from '@/utils/transactions/getTransactionStatusLabel';
import type { Transaction } from '@/types/transaction';
import type { Token } from '@/types';

type Props = {
  transaction: Transaction;
  tokens: Token[];
  onClose: () => void;
};

const DetailRow = ({
  label,
  children,
}: PropsWithChildren<{ label: string }>) => (
  <div className="flex items-center justify-between">
    <span className="text-sw-label-md text-sw-gray-200">{label}</span>
    <div className="flex items-center gap-x-sw-sm">{children}</div>
  </div>
);

const calculateFee = (tx: Transaction): number => {
  if (tx.appFees.length === 0) {
    return 0;
  }

  const amountIn = parseFloat(tx.amountInFormatted);

  return tx.appFees.reduce((sum, { fee }) => sum + (amountIn * fee) / 10000, 0);
};

export const TransactionDetails = ({
  transaction: tx,
  tokens,
  onClose,
}: Props) => {
  const fullType = getTransactionType(tx);
  const type = fullType.split(' ')[0];
  const status = getTransactionStatusLabel(tx.status);
  const formattedDate = new Date(tx.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const originToken = tokens.find((t) => t.assetId === tx.originAsset);
  const destToken = tokens.find((t) => t.assetId === tx.destinationAsset);

  const isSwap = type === 'Swap';
  const isDeposit = type === 'Deposit';
  const explorerHash = tx.depositAddress;

  const fee = calculateFee(tx);

  const amountIn = parseFloat(tx.amountInFormatted);
  const amountOut = parseFloat(tx.amountOutFormatted);
  const rate = isSwap && amountIn > 0 ? amountOut / amountIn : null;

  return (
    <Card className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-sw-2xl">
        <div className="flex flex-col">
          <span className="text-sw-label-lg text-sw-gray-50 mb-sw-md">
            {type}
          </span>
          <span className="text-sw-label-sm text-sw-gray-200">
            {formattedDate}
          </span>
        </div>
        <CloseButton
          transparent
          onClick={onClose}
          className="relative -top-[10px] -right-[8px]"
        />
      </div>

      <Hr />

      {/* Token amounts */}
      <div className="flex flex-col gap-y-sw-md py-sw-2xl">
        {!!originToken && (
          <TransactionDetailsToken
            token={originToken}
            amount={tx.amountInFormatted}
            usdAmount={tx.amountInUsd}
          />
        )}

        {!!isSwap && !!destToken && (
          <>
            <div className="w-[40px] h-[40px] flex items-center justify-center">
              <ArrowDownward className="h-sw-xl w-sw-xl text-sw-gray-200" />
            </div>
            <TransactionDetailsToken
              token={destToken}
              amount={tx.amountOutFormatted}
              usdAmount={tx.amountOutUsd}
            />
          </>
        )}
      </div>

      <Hr />

      {/* Detail rows */}
      <div className="flex flex-col px-sw-lg pt-sw-2xl gap-y-sw-2xl">
        <DetailRow label="Status">
          <TransactionStatusBadge status={status} />
        </DetailRow>

        {isSwap && rate !== null && !!destToken && !!originToken && (
          <DetailRow label="Rate">
            <span className="text-sw-body-md text-sw-gray-50">
              1 {destToken.symbol} = <TinyNumber value={String(rate)} />{' '}
              {originToken.symbol}
            </span>
          </DetailRow>
        )}

        {isDeposit && !!tx.senders[0] && (
          <DetailRow label="From">
            <span className="text-sw-body-md text-sw-gray-50">
              {formatAddressTruncate(tx.senders[0], 14)}
            </span>
            <CopyButton value={tx.senders[0]} />
          </DetailRow>
        )}

        {fee > 0 && originToken && (
          <DetailRow label="Fee">
            <span className="text-sw-body-md text-sw-gray-50">
              <TinyNumber value={String(fee)} /> {originToken.symbol}
              {(() => {
                const feeUsd =
                  tx.amountInUsd && parseFloat(tx.amountInFormatted) > 0
                    ? fee *
                      (parseFloat(tx.amountInUsd) /
                        parseFloat(tx.amountInFormatted))
                    : 0;

                return feeUsd >= 0.005 ? (
                  <span className="text-sw-gray-400">
                    {' '}
                    ({formatUsdAmount(feeUsd)})
                  </span>
                ) : null;
              })()}
            </span>
          </DetailRow>
        )}

        <DetailRow label="Explorer link">
          <a
            href={`https://explorer.near-intents.org/transactions/${explorerHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-x-sw-sm text-sw-body-md text-sw-gray-50 hover:text-sw-accent-50 transition-colors">
            {formatAddressTruncate(explorerHash, 14)}
            <OpenInNew className="h-sw-lg w-sw-lg" />
          </a>
        </DetailRow>

        {!!tx.intentHashes && (
          <DetailRow label="Intent hash">
            <span className="text-sw-body-md text-sw-gray-50">
              {formatAddressTruncate(tx.intentHashes, 14)}
            </span>
            <CopyButton value={tx.intentHashes} />
          </DetailRow>
        )}
      </div>
    </Card>
  );
};
