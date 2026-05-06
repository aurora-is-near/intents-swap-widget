import { type PropsWithChildren } from 'react';
import { OpenInNewW700 as OpenInNew } from '@material-symbols-svg/react-rounded/icons/open-in-new';
import { ArrowDownwardW700 as ArrowDownward } from '@material-symbols-svg/react-rounded/icons/arrow-downward';

import { Card } from '@/components/Card';
import { CloseButton } from '@/components/CloseButton';
import { TinyNumber } from '@/components/TinyNumber';
import { CopyButton } from '@/components/CopyButton';
import { Hr } from '@/components/Hr';
import { formatUsdAmount } from '@/utils/formatters/formatUsdAmount';
import { formatAddressTruncate } from '@/utils/formatters/formatAddressTruncate';
import { getTransactionStatusLabel } from '@/utils/transactions/getTransactionStatusLabel';
import { findTransactionToken } from '@/utils/transactions/findTransactionToken';
import type { FakeTransaction, Transaction } from '@/types/transaction';
import type { Token } from '@/types';
import { TransactionStatusBadge } from './TransactionStatusBadge';
import { TransactionDetailsToken } from './TransactionDetailsToken';

type Props = {
  transaction: Transaction | FakeTransaction;
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

const isRealTransaction = (
  tx: Transaction | FakeTransaction,
): tx is Transaction => {
  return 'intentHashes' in tx;
};

const calculateFee = (tx: Transaction | FakeTransaction): number => {
  if (!isRealTransaction(tx)) {
    return 0;
  }

  if (!tx.appFees || tx.appFees.length === 0) {
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
  const status = getTransactionStatusLabel(tx.status);
  const formattedDate = new Date(tx.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const originToken = findTransactionToken(tokens, tx.originAsset);
  const destToken = findTransactionToken(tokens, tx.destinationAsset);
  const explorerHash = isRealTransaction(tx) ? tx.depositAddress : null;

  const fee = calculateFee(tx);

  const amountIn = parseFloat(tx.amountInFormatted);
  const amountOut = parseFloat(tx.amountOutFormatted);
  const rate = amountIn > 0 ? amountOut / amountIn : null;

  return (
    <Card className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-sw-2xl">
        <div className="flex flex-col">
          <span className="text-sw-label-lg text-sw-gray-50 mb-sw-md">
            Swap
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

        {!!destToken && (
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

        {rate !== null && !!destToken && !!originToken && (
          <DetailRow label="Rate">
            <span className="text-sw-body-md text-sw-gray-50">
              1 {destToken.symbol} = <TinyNumber value={String(rate)} />{' '}
              {originToken.symbol}
            </span>
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

        {!!explorerHash && (
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
        )}

        {isRealTransaction(tx) && !!tx.intentHashes && (
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
