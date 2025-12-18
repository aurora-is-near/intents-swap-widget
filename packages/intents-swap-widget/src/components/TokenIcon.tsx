import { Icon } from './Icon';

import { cn } from '@/utils';

type TokenItemProps = {
  icon: string;
  name: string;
  className?: string;
} & (
  | {
      chainShowIcon: true;
      chainIcon: string;
      chainName: string;
    }
  | {
      chainShowIcon: false;
      chainIcon?: string | undefined;
      chainName?: string | undefined;
    }
);

const BORDER_RADIUS = 4;

export const TokenIcon = ({
  icon,
  name,
  chainName,
  chainIcon,
  chainShowIcon,
  className,
}: TokenItemProps) => (
  <div className="relative flex items-center">
    <Icon icon={icon} label={name} />
    {chainShowIcon && (
      <div
        className={cn(
          'absolute top-[19px] right-[-4px] flex h-[16px] w-[16px] items-center justify-center overflow-hidden border-2',
          className,
        )}
        style={{ borderRadius: BORDER_RADIUS }}>
        <Icon
          size={16}
          radius={BORDER_RADIUS}
          icon={chainIcon}
          label={chainName}
        />
      </div>
    )}
  </div>
);
