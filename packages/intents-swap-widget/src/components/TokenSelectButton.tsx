import { cn } from '@/utils/cn';

import { useTypedTranslation } from '@/localisation';
import type { Token } from '@/types/token';

import { TokenIcon } from './TokenIcon';

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
  const { t } = useTypedTranslation();

  return (
    <div className="h-[36px] flex items-center justify-center">
      <button
        type="button"
        disabled={state === 'disabled'}
        onClick={state === 'disabled' ? undefined : onClick}
        className={cn(
          'gap-sw-md pl-sw-sm pr-sw-md flex h-[40px] min-w-[80px] shrink-0 items-center rounded-sw-md transition-colors bg-sw-gray-800 group',
          {
            'cursor-pointer hover:bg-sw-gray-700': state !== 'disabled',
            'cursor-not-allowed': state === 'disabled',
          },
        )}>
        {token && (
          <TokenIcon
            token={token}
            className={cn('border-sw-gray-800 transition-colors top-[14px]', {
              'group-hover:border-sw-gray-700': state !== 'disabled',
            })}
          />
        )}
        <span
          className={cn('text-sw-label-md', {
            'text-sw-gray-50': state !== 'disabled',
            'text-sw-gray-400': state === 'disabled',
          })}>
          {token
            ? token.symbol
            : t('tokens.input.selectToken.label', 'Select token')}
        </span>
      </button>
    </div>
  );
};
