import { EmergencyFillW700 as Emergency } from '@material-symbols-svg/react-rounded/icons/emergency';

import { Button } from '@/uikit/Button';

type Props = {
  title: string;
  description: string;
} & (
  | { action?: never; onClick?: never }
  | { action: string; onClick: () => void }
);

export const InfoBanner = ({ title, description, action, onClick }: Props) => (
  <div className="flex flex-col sm:flex-row gap-csw-lg sm:items-center justify-between bg-csw-status-warning rounded-csw-lg px-csw-2xl py-csw-xl">
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
