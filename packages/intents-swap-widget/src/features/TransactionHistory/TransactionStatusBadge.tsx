import { TransactionsStatusLabel } from '@/types';
import { cn } from '@/utils';

type Variant = 'default' | 'title';

type Props = {
  status: TransactionsStatusLabel;
  variant?: Variant;
};

const VARIANT_CLASSES: Record<
  Variant,
  { container: string; icon: string; label: string }
> = {
  default: {
    container: 'gap-x-sw-sm',
    icon: 'h-sw-xl w-sw-xl',
    label: 'text-sw-label-md',
  },
  title: {
    container: 'gap-x-sw-lg',
    icon: 'h-sw-[28px] w-sw-[28px]',
    label: 'text-sw-label-lg',
  },
};

export const TransactionStatusBadge = ({
  status,
  variant = 'default',
}: Props) => {
  const variantClasses = VARIANT_CLASSES[variant];

  return (
    <div
      className={cn(
        'flex items-center',
        variantClasses.container,
        status.colorClassName,
      )}>
      {status.Icon && (
        <status.Icon
          className={cn(variantClasses.icon, {
            'animate-spin': status.iconIsSpinning,
          })}
        />
      )}
      <span className={variantClasses.label}>{status.label}</span>
    </div>
  );
};
