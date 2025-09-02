import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GetExecutionStatusResponse } from '@defuse-protocol/one-click-sdk-typescript';
import * as Icons from 'lucide-react';

import { notReachable } from '@/utils';
import { CHAIN_IDS_MAP } from '@/constants/chains';
import { useExternalDepositStatus } from '@/hooks';
import { CopyButton, StatusWidget } from '@/components';
import { fireEvent, guardStates, moveTo, useUnsafeSnapshot } from '@/machine';
import { formatAddressTruncate } from '@/utils/formatters/formatAddressTruncate';
import { getTransactionLink } from '@/utils/formatters/getTransactionLink';
import { isNotEmptyAmount } from '@/utils/checkers/isNotEmptyAmount';
import type { TransferResult } from '@/types';

type Msg =
  | { type: 'on_transaction_received' }
  | { type: 'on_successful_transfer'; transferResult: TransferResult };

type Props = {
  onMsg: (msg: Msg) => void;
};

const QrCode = ({ address }: { address: string }) => (
  <div className="flex flex-col gap-sw-2xl items-center">
    <div className="p-sw-lg m-sw-lg mx-auto w-fit rounded-md bg-white">
      <QRCodeSVG size={156} value={address} fgColor="#31343d" />
    </div>
    <div className="py-sw-lg px-sw-lg w-full flex items-center justify-between rounded-md bg-sw-gray-600">
      <span className="text-label-m text-sw-gray-100">
        {formatAddressTruncate(address, 42)}
      </span>
      <CopyButton value={address} />
    </div>
  </div>
);

const Skeleton = () => {
  const { ctx } = useUnsafeSnapshot();

  return (
    <div className="flex flex-col gap-sw-2xl items-center">
      <div className="bg-sw-gray-600 h-[180px] w-[180px] animate-pulse rounded-md" />
      <div className="bg-sw-gray-600 h-[44px] w-full animate-pulse rounded-md flex items-center justify-center gap-sw-sm">
        <Icons.Loader className="animate-spin text-sw-gray-100 h-sw-lg w-sw-lg" />
        <span className="text-sw-gray-100 text-label-s">
          {!isNotEmptyAmount(ctx.sourceTokenAmount)
            ? 'Waiting for token amount'
            : 'Fetching new address'}
        </span>
      </div>
    </div>
  );
};

export const ExternalDeposit = ({ onMsg }: Props) => {
  const { ctx } = useUnsafeSnapshot();

  const isValidState = guardStates(ctx, [
    'quote_success_external',
    'quote_success_internal',
  ]);

  const depositStatusQuery = useExternalDepositStatus(
    isValidState ? ctx.quote.depositAddress : '',
  );

  useEffect(() => {
    if (
      depositStatusQuery.status === 'success' &&
      depositStatusQuery.data?.status ===
        GetExecutionStatusResponse.status.PROCESSING
    ) {
      onMsg({ type: 'on_transaction_received' });
    }
  }, [depositStatusQuery, onMsg]);

  useEffect(() => {
    if (
      depositStatusQuery.status === 'success' &&
      depositStatusQuery.data?.status ===
        GetExecutionStatusResponse.status.SUCCESS
    ) {
      const txHash =
        depositStatusQuery.data.swapDetails.destinationChainTxHashes[0]?.hash;

      fireEvent('transferSetStatus', { status: 'success' });
      moveTo('transfer_success');

      onMsg({
        type: 'on_successful_transfer',
        transferResult: {
          hash: txHash ?? '',
          intent: depositStatusQuery.data.swapDetails.intentHashes[0],
          transactionLink:
            (ctx.sourceToken &&
              txHash &&
              getTransactionLink(
                CHAIN_IDS_MAP[ctx.sourceToken.blockchain],
                txHash,
              )) ??
            '',
        },
      });
    }
  }, [depositStatusQuery, ctx.sourceToken]);

  useEffect(() => {
    switch (depositStatusQuery.data?.status) {
      case GetExecutionStatusResponse.status.FAILED:
        fireEvent('transferSetStatus', { status: 'error' });
        fireEvent('errorSet', { code: 'EXTERNAL_TRANSFER_FAILED' });
        break;
      case GetExecutionStatusResponse.status.INCOMPLETE_DEPOSIT:
        fireEvent('transferSetStatus', { status: 'error' });
        fireEvent('errorSet', { code: 'EXTERNAL_TRANSFER_INCOMPLETE' });
        break;
      case GetExecutionStatusResponse.status.REFUNDED:
        fireEvent('transferSetStatus', { status: 'error' });
        fireEvent('errorSet', { code: 'EXTERNAL_TRANSFER_REFUNDED' });
        break;
      default:
        break;
    }
  }, []);

  if (!isValidState) {
    return <Skeleton />;
  }

  if (!depositStatusQuery.data) {
    return <QrCode address={ctx.quote.depositAddress} />;
  }

  switch (depositStatusQuery.status) {
    case 'error':
      return <StatusWidget.Error message="Unable to check transfer status" />;

    case 'success': {
      switch (depositStatusQuery.data.status) {
        case GetExecutionStatusResponse.status.FAILED:
          return (
            <StatusWidget.Error message="Unable to check transfer status" />
          );
        case GetExecutionStatusResponse.status.INCOMPLETE_DEPOSIT:
          return <StatusWidget.Error message="Incomplete deposit" />;
        case GetExecutionStatusResponse.status.REFUNDED:
          return (
            <StatusWidget.Error message="Deposit failed. You were refunded." />
          );
        case GetExecutionStatusResponse.status.PROCESSING:
        case GetExecutionStatusResponse.status.KNOWN_DEPOSIT_TX:
          return <StatusWidget.Success />;
        case GetExecutionStatusResponse.status.PENDING_DEPOSIT:
          return <QrCode address={ctx.quote.depositAddress} />;
        case GetExecutionStatusResponse.status.SUCCESS:
          return <StatusWidget.Success />;
        default:
          return null;
      }
    }

    default:
      return notReachable(depositStatusQuery);
  }
};
