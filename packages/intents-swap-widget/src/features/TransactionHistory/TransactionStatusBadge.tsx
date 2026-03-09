import { TransactionsStatusLabel } from '@/types';
import { cn } from '@/utils';

type Props = {
  status: TransactionsStatusLabel;
};

export const TransactionStatusBadge = ({ status }: Props) => {
  return (
    <div className={cn('flex items-center gap-x-sw-sm', status.colorClassName)}>
      {status.Icon && (
        <status.Icon
          className={cn('h-sw-xl w-sw-xl', {
            'animate-spin': status.iconIsSpinning,
          })}
        />
      )}
      <span className="text-sw-label-md">{status.label}</span>
    </div>
  );
};
