import clsx from 'clsx';

import { Skeleton } from '@/components/Skeleton';
import { TinyNumber } from '@/components/TinyNumber';
import type { Token, TokenBalance } from '@/types/token';

type Props = {
  token: Token;
  balance: TokenBalance;
  isNotSufficient: boolean;
};

export const WalletBalance = ({
  token,
  balance,
  isNotSufficient = false,
}: Props) => {
  if (balance === undefined) {
    return <Skeleton width={100} />;
  }

  return (
    <span
      className={clsx('text-sw-label-s', {
        'text-sw-alert-100': isNotSufficient,
        'text-sw-gray-100': !isNotSufficient,
      })}>
      <TinyNumber
        decimals={token.decimals}
        value={balance === undefined ? '0' : `${balance}`}
      />
    </span>
  );
};
