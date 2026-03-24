import clsx from 'clsx';

import { useSupportedChains } from '../../hooks/useSupportedChains';

import { Tooltip } from '@/components/Tooltip';
import { Skeleton } from '@/components/Skeleton';
import { TinyNumber } from '@/components/TinyNumber';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';
import { useBalancesUpdate } from '@/context/BalancesUpdateContext';
import { useTypedTranslation } from '@/localisation';
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
  const { t } = useTypedTranslation();

  const { supportedChains } = useSupportedChains();
  const { pendingBalances } = useBalancesUpdate();

  if (!token.isIntent && !supportedChains.includes(token.blockchain)) {
    return <span />;
  }

  if (balance === undefined) {
    return <Skeleton width={100} />;
  }

  const isBalanceUpdating = Object.keys(pendingBalances).includes(
    getTokenBalanceKey(token),
  );

  return (
    <div className="flex items-center">
      <Tooltip
        isDisabled={!isBalanceUpdating}
        className="mr-sw-xs"
        text={t(
          'tokenInput.balanceUpdating.tooltip',
          'You just swapped this token. The balance is updating and will refresh in a few seconds.',
        )}>
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
            'animate-pulse': isBalanceUpdating,
          })}>
          <TinyNumber
            decimals={token.decimals}
            value={balance === undefined ? '0' : `${balance}`}
          />
        </span>
      </Tooltip>
    </div>
  );
};
