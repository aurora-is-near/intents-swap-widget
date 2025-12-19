import { Icon } from './Icon';

import { cn } from '@/utils';
import { TOKENS_DATA } from '@/constants/tokens';
import { ASSET_ICONS, CHAIN_ICONS, UNKNOWN_ICON } from '@/icons';
import type { Token } from '@/types/token';

type TokenItemProps = {
  token: Token;
  chainShowIcon: boolean;
  className?: string;
};

const BORDER_RADIUS = 4;

export const TokenIcon = ({
  token,
  chainShowIcon,
  className,
}: TokenItemProps) => {
  const tokenSymbolLowerCase = token.symbol.toLowerCase();
  const chainIcon = CHAIN_ICONS[token.blockchain] ?? UNKNOWN_ICON;
  const tokenIcon =
    ASSET_ICONS[tokenSymbolLowerCase] ??
    TOKENS_DATA[tokenSymbolLowerCase]?.icon;

  return (
    <div className="relative flex items-center">
      <Icon icon={tokenIcon} label={token.name} />
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
            label={token.chainName}
          />
        </div>
      )}
    </div>
  );
};
