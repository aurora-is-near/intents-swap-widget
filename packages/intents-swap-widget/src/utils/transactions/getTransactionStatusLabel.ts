import { ProgressActivityW700 as ProgressActivityIcon } from '@material-symbols-svg/react-rounded/icons/progress-activity';
import { CheckCircleFillW700 as CheckCircleIcon } from '@material-symbols-svg/react-rounded/icons/check-circle';
import { CancelFillW700 as CancelIcon } from '@material-symbols-svg/react-rounded/icons/cancel';
import { ArrowCircleLeftFillW700 as ArrowCircleLeftIcon } from '@material-symbols-svg/react-rounded/icons/arrow-circle-left';
import { InfoFillW700 as InfoIcon } from '@material-symbols-svg/react-rounded/icons/info';
import { sentenceCase } from 'change-case';
import type {
  TransactionsStatusLabel,
  TransactionStatus,
  TransactionType,
} from '@/types/transaction';

const composeLabel = (word: string, transactionType?: TransactionType) =>
  sentenceCase([transactionType, word].filter(Boolean).join(' '));

export const getTransactionStatusLabel = (
  status: TransactionStatus,
  transactionType?: TransactionType,
): TransactionsStatusLabel => {
  switch (status) {
    case 'PENDING':
      return {
        label: composeLabel('Pending', transactionType),
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
    case 'PROCESSING':
      return {
        label: composeLabel('Processing', transactionType),
        colorClassName: 'text-sw-accent-50',
        Icon: ProgressActivityIcon,
        iconIsSpinning: true,
      };
    case 'SUCCESS':
      return {
        label: composeLabel('Completed', transactionType),
        colorClassName: 'text-sw-status-success',
        Icon: CheckCircleIcon,
      };
    case 'FAILED':
      return {
        label: composeLabel('Failed', transactionType),
        colorClassName: 'text-sw-status-error',
        Icon: CancelIcon,
      };
    case 'REFUNDED':
      return {
        label: composeLabel('Refunded', transactionType),
        colorClassName: 'text-sw-status-warning',
        Icon: ArrowCircleLeftIcon,
      };
    case 'UNRESOLVED':
      return {
        label: composeLabel('In progress', transactionType),
        colorClassName: 'text-sw-status-warning',
        Icon: InfoIcon,
      };
    default:
      return {
        label: status,
        colorClassName: 'text-sw-gray-200',
      };
  }
};
