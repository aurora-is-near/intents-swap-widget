import clsx from 'clsx';
import { EmergencyFillW700 as Emergency } from '@material-symbols-svg/react-rounded/icons/emergency';

import { Button } from '@/uikit/Button';

type Props = {
  title: string;
  description: string;
  state?: 'error' | 'warning';
} & (
  | { action?: never; onClick?: never }
  | { action: string; onClick: () => void }
);

const InfoBannerBase = ({
  title,
  state = 'warning',
  description,
  action,
  onClick,
}: Props) => (
  <div
    className={clsx(
      'flex flex-col sm:flex-row gap-csw-lg sm:items-center justify-between rounded-csw-lg px-csw-2xl py-csw-xl',
      {
        'bg-csw-status-error': state === 'error',
        'bg-csw-status-warning': state === 'warning',
      },
    )}>
    <div className="flex flex-col gap-csw-xs">
      <div className="flex items-center gap-csw-xs">
        <Emergency size={16} className="text-csw-gray-950" />
        <span className="text-csw-label-md text-csw-gray-950">{title}</span>
      </div>
      <p className="text-csw-body-sm text-csw-gray-900">{description}</p>
    </div>
    {!!action && (
      <Button
        variant="outlined"
        detail="dimmed"
        size="sm"
        fluid
        onClick={onClick}>
        {action}
      </Button>
    )}
  </div>
);

const InfoBannerSkeleton = () => (
  <div className="flex flex-col sm:flex-row gap-csw-lg sm:items-center justify-between rounded-csw-lg px-csw-2xl py-csw-xl animate-pulse bg-csw-gray-900 h-[70px]" />
);

export const InfoBanner = Object.assign(InfoBannerBase, {
  Skeleton: InfoBannerSkeleton,
});
