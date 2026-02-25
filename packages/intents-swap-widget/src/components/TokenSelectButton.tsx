import { TokenIcon } from './TokenIcon';
import { cn } from '@/utils/cn';

import type { Token } from '@/types/token';

type Props = {
  token: Token | undefined;
  state?: 'default' | 'disabled';
  onClick: () => void;
};

export const TokenSelectButton = ({
  token,
  state = 'default',
  onClick,
}: Props) => {
  return (
    <button
      type="button"
      disabled={state === 'disabled'}
      onClick={state === 'disabled' ? undefined : onClick}
      className={cn(
        'gap-sw-md pl-sw-sm pr-sw-md flex h-[36px] min-w-[80px] shrink-0 items-center rounded-sw-md transition-colors bg-sw-gray-800 hover:bg-sw-gray-700 group',
        {
          'cursor-pointer': state !== 'disabled',
          'animate-pulse cursor-default': state === 'disabled',
        },
      )}>
      {token && (
        <TokenIcon
          token={token}
          chainShowIcon={!token.isIntent}
          className="border-sw-gray-800 group-hover:border-sw-gray-700 transition-colors top-[14px]"
        />
      )}
      <span className="text-sw-label-md text-sw-gray-50">
        {token ? token.symbol : 'Select token'}
      </span>
    </button>
  );
};
