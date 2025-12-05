import clsx from 'clsx';

import { useConfig } from '@/config';
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
  const config = useConfig();

  if (
    !token.isIntent &&
    !config.walletSupportedChains.includes(token.blockchain)
  ) {
    return <span />;
  }

  if (balance === undefined) {
    return <Skeleton width={100} />;
  }

  return (
    <span
      onClick={balance ? onClick : undefined}
      // unable to make border-bottom work via tailwind
      style={
        balance
          ? { borderBottomWidth: '2px', borderStyle: 'dotted' }
          : undefined
      }
      className={clsx('text-sw-label-sm', {
        'text-sw-status-error': isNotSufficient,
        'text-sw-gray-100': !isNotSufficient,
        'cursor-pointer': !!balance && !!onClick,
      })}>
      <TinyNumber
        decimals={token.decimals}
        value={balance === undefined ? '0' : `${balance}`}
      />
    </span>
  );
};
