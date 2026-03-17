import { useCallback, useEffect } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { GetExecutionStatusResponse } from '@defuse-protocol/one-click-sdk-typescript';
import { ProgressActivityW700 as ProgressActivity } from '@material-symbols-svg/react-rounded/icons/progress-activity';

import { notReachable } from '@/utils';
import { useExternalDepositStatus } from '@/hooks';
import { useTypedTranslation } from '@/localisation';
import { CopyButton, StatusWidget } from '@/components';
import { AURORA_BASE64_LOGO } from '@/constants/chains';
import {
  fireEvent,
  guardStates,
  moveTo,
  useComputedSnapshot,
  useUnsafeSnapshot,
} from '@/machine';
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

const InputReadonlyCopy = ({
  label,
  displayValue,
  copyValue,
}: {
  label?: string;
  copyValue: string;
  displayValue?: string;
}) => (
  <div className="flex flex-col gap-y-sw-xs">
    {!!label && (
      <span className="text-sw-label-sm text-sw-gray-200">{label}</span>
    )}
    <div className="py-sw-lg px-sw-lg w-full flex items-center justify-between rounded-sw-md bg-sw-gray-800">
      <span className="text-sw-label-md text-sw-gray-100 w-full text-center">
        {displayValue ?? copyValue}
      </span>
      <CopyButton value={copyValue} />
    </div>
  </div>
);

const qrCode = new QRCodeStyling({
  width: 200,
  height: 200,
  image: AURORA_BASE64_LOGO,
  type: 'svg',
  /** H + smaller logo area: center image must not wipe data modules without ECC */
  qrOptions: {
    errorCorrectionLevel: 'H',
  },
  dotsOptions: {
    color: '#161926',
    type: 'extra-rounded',
  },
  backgroundOptions: {
    color: '#fff',
  },
  cornersSquareOptions: {
    type: 'dot',
  },
  cornersDotOptions: {
    type: 'dot',
  },
  imageOptions: {
    crossOrigin: 'anonymous',
    /** Coefficient 0–1 (not px). Over ~0.5 hurts scan reliability; default 0.4 */
    hideBackgroundDots: true,
    imageSize: 0.4,
    margin: 8,
  },
});

const QrCode = ({ address }: { address: string }) => {
  const { ctx } = useUnsafeSnapshot();
  const { t } = useTypedTranslation();

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      qrCode.append(node);
    }
  }, []);

  useEffect(() => {
    qrCode.update({
      data: address,
    });
  }, [address]);

  const isValidState = guardStates(ctx, [
    'quote_success_internal',
    'quote_success_external',
  ]);

  if (!isValidState) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-sw-xl">
      <div className="mx-auto w-fit p-sw-lg mb-sw-xl rounded-[32px] bg-[#fff]">
        <div ref={containerRef} />
      </div>
      <div className="flex flex-col gap-y-sw-lg">
        <InputReadonlyCopy
          copyValue={address}
          label={t('deposit.external.address.label', 'Send to this address')}
          displayValue={formatAddressTruncate(address, {
            mode: 'manual',
            leftVisible: 8,
            rightVisible: 6,
          })}
        />
        {!!ctx.quote.depositMemo && (
          <InputReadonlyCopy
            copyValue={ctx.quote.depositMemo}
            label={t(
              'deposit.external.memo.label',
              'Use this transaction memo (required)',
            )}
          />
        )}
      </div>
    </div>
  );
};

const Skeleton = () => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();

  return (
    <div className="flex flex-col gap-sw-2xl items-center">
      <div className="bg-sw-gray-800 h-[180px] w-[180px] animate-pulse rounded-sw-md" />
      <div className="bg-sw-gray-800 h-[44px] w-full animate-pulse rounded-sw-md flex items-center justify-center gap-sw-sm">
        <ProgressActivity className="animate-spin text-sw-gray-100 h-sw-lg w-sw-lg" />
        <span className="text-sw-gray-100 text-sw-label-sm">
          {!isNotEmptyAmount(ctx.sourceTokenAmount)
            ? t('deposit.external.loading.waiting', 'Waiting for token amount')
            : t('deposit.external.loading.fetching', 'Fetching new address')}
        </span>
      </div>
    </div>
  );
};

export const ExternalDeposit = ({ onMsg }: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { isNativeNearDeposit } = useComputedSnapshot();

  const isValidState = guardStates(ctx, [
    'quote_success_external',
    'quote_success_internal',
  ]);

  const isBridgePoaDeposit =
    (isNativeNearDeposit && ctx.isDepositFromExternalWallet) ||
    (!isNativeNearDeposit &&
      ctx.sourceToken?.assetId === ctx.targetToken?.assetId);

  const depositStatusQuery = useExternalDepositStatus({
    depositAddress: isValidState ? ctx.quote.depositAddress : '',
    depositAddressType: isBridgePoaDeposit ? 'poa' : 'one_click',
  });

  useEffect(() => {
    const status = depositStatusQuery.data?.status;

    if (!depositStatusQuery.data) {
      return;
    }

    switch (status) {
      case GetExecutionStatusResponse.status.SUCCESS: {
        const txHash =
          depositStatusQuery.data.swapDetails.destinationChainTxHashes[0]?.hash;

        fireEvent('transferSetStatus', { status: 'success' });
        moveTo('transfer_success');

        onMsg({
          type: 'on_successful_transfer',
          transferResult: {
            hash: txHash ?? '',
            amount: depositStatusQuery.data.swapDetails.amount,
            intent: depositStatusQuery.data.swapDetails.intentHashes[0],
            transactionLink:
              (ctx.sourceToken &&
                txHash &&
                getTransactionLink(ctx.sourceToken.blockchain, txHash)) ??
              '',
          },
        });
        break;
      }

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
      case GetExecutionStatusResponse.status.PROCESSING:
      case GetExecutionStatusResponse.status.KNOWN_DEPOSIT_TX:
        // Transaction was received from external wallet
        fireEvent('externalDepositTxSet', true);
        onMsg({ type: 'on_transaction_received' });
        break;
      case GetExecutionStatusResponse.status.PENDING_DEPOSIT:
      case undefined:
        // No action needed - waiting for deposit
        break;
      default:
        notReachable(status);
    }
    // do not include onMsg to avoid infinite loop
  }, [depositStatusQuery.data, ctx.sourceToken]);

  if (!isValidState) {
    return <Skeleton />;
  }

  if (!depositStatusQuery.data) {
    return <QrCode address={ctx.quote.depositAddress} />;
  }

  switch (depositStatusQuery.status) {
    case 'error':
      return (
        <StatusWidget.Error
          message={t(
            'deposit.external.error.noStatus',
            'Unable to check transfer status',
          )}
        />
      );

    case 'success': {
      switch (depositStatusQuery.data.status) {
        case GetExecutionStatusResponse.status.FAILED:
          return (
            <StatusWidget.Error
              message={t(
                'deposit.external.error.noStatus',
                'Unable to check transfer status',
              )}
            />
          );
        case GetExecutionStatusResponse.status.INCOMPLETE_DEPOSIT:
          return (
            <StatusWidget.Error
              message={t(
                'deposit.external.error.incomplete',
                'Incomplete deposit',
              )}
            />
          );
        case GetExecutionStatusResponse.status.REFUNDED:
          return (
            <StatusWidget.Error
              message={t(
                'deposit.external.error.failed',
                'Deposit failed. You were refunded.',
              )}
            />
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
