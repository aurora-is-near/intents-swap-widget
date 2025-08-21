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
  <div className="relative block">
    <Icon noLoadedBg variant="dark" icon={icon} label={name} />
    {chainShowIcon && (
      <div className="absolute top-[17px] right-[-4px] flex h-[12px] w-[12px] items-center justify-center overflow-hidden rounded-[4px] ring-2 ring-gray-900">
        <Icon
          size={12}
          radius={4}
          variant="dark"
          icon={chainIcon}
          label={chainName}
        />
      </div>
    )}
  </div>
);
