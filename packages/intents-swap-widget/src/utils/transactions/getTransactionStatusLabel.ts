import { ProgressActivityW700 as ProgressActivityIcon } from '@material-symbols-svg/react-rounded/icons/progress-activity';
import { CheckCircleFillW700 as CheckCircleIcon } from '@material-symbols-svg/react-rounded/icons/check-circle';
import { CancelFillW700 as CancelIcon } from '@material-symbols-svg/react-rounded/icons/cancel';
import { ArrowCircleLeftFillW700 as ArrowCircleLeftIcon } from '@material-symbols-svg/react-rounded/icons/arrow-circle-left';
import type {
  TransactionsStatusLabel,
  TransactionStatus,
} from '@/types/transaction';

export const getTransactionStatusLabel = (
  status: TransactionStatus,
): TransactionsStatusLabel => {
  switch (status) {
    case 'SUCCESS':
      return {
        label: 'Completed',
        colorClassName: 'text-sw-status-success',
        Icon: CheckCircleIcon,
      };
    case 'PROCESSING':
      return {
        label: 'Processing',
        colorClassName: 'text-sw-accent-50',
        Icon: ProgressActivityIcon,
        iconIsSpinning: true,
      };
    case 'WAITING_FOR_FUNDS':
      return {
        label: 'Waiting for funds',
        colorClassName: 'text-sw-accent-50',
        Icon: ProgressActivityIcon,
        iconIsSpinning: true,
      };
    case 'FAILED':
      return {
        label: 'Failed',
        colorClassName: 'text-sw-status-error',
        Icon: CancelIcon,
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        colorClassName: 'text-sw-status-warning',
        Icon: ArrowCircleLeftIcon,
      };
    default:
      return {
        label: status,
        colorClassName: 'text-sw-gray-200',
      };
  }
};
