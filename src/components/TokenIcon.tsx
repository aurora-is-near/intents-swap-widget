import { Icon } from './Icon';

type TokenItemProps = {
  icon: string;
  name: string;
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

export const TokenIcon = ({
  icon,
  name,
  chainName,
  chainIcon,
  chainShowIcon,
}: TokenItemProps) => (
  <div className="relative flex items-center">
    <Icon noLoadedBg variant="dark" icon={icon} label={name} />
    {chainShowIcon && (
      <div className="absolute top-[17px] right-[-4px] flex h-[16px] w-[16px] items-center justify-center overflow-hidden rounded-[4px] border-2 border-sw-gray-900">
        <Icon
          size={16}
          radius={6}
          variant="dark"
          icon={chainIcon}
          label={chainName}
        />
      </div>
    )}
  </div>
);
