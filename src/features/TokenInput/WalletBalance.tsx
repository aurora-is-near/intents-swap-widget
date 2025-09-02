import clsx from 'clsx';

import { Skeleton } from '@/components/Skeleton';
import { TinyNumber } from '@/components/TinyNumber';
import type { Token, TokenBalance } from '@/types/token';

type Props = {
  token: Token;
  balance: TokenBalance;
  isNotSufficient: boolean;
  onClick?: () => void;
};

export const WalletBalance = ({
  token,
  balance,
  isNotSufficient = false,
  onClick,
}: Props) => {
  if (balance === undefined) {
    return <Skeleton width={100} />;
  }

  return (
    <span
      onClick={onClick}
      className={clsx('text-sw-label-s', {
        'text-sw-alert-100': isNotSufficient,
        'text-sw-gray-100': !isNotSufficient,
        'cursor-pointer': !!onClick,
      })}>
      <TinyNumber
        decimals={token.decimals}
        value={balance === undefined ? '0' : `${balance}`}
      />
    </span>
  );
};
