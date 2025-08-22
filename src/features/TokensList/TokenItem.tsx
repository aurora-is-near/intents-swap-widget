import { cn } from '@/utils/cn';
import { useConfig } from '@/config';
import { useUnsafeSnapshot } from '@/machine/snap';
import { TokenIcon } from '@/components/TokenIcon';
import { TinyNumber } from '@/components/TinyNumber';
import { getUsdDisplayBalance } from '@/utils/formatters/getUsdDisplayBalance';
import type { Token, TokenBalance } from '@/types/token';

export const TOKEN_ITEM_HEIGHT = 50;

type Msg = { type: 'on_select_token'; token: Token };

type Props = {
  token: Token;
  balance: TokenBalance;
  isNotSelectable?: boolean;
  className?: string;
  onMsg: (msg: Msg) => void;
};

export const TokenItem = ({
  token,
  balance,
  isNotSelectable,
  className,
  onMsg,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { walletSupportedChains, appName } = useConfig();
  const displayUsdBalance = getUsdDisplayBalance(balance, token);
  const isTokenSupported =
    walletSupportedChains.includes(token.blockchain) || token.isIntent;

  return (
    <li className="list-none">
      <div
        className={cn(
          'gap-ds-lg py-ds-md px-ds-lg flex cursor-pointer justify-between rounded-md transition-colors hover:bg-gray-600',
          {
            'cursor-not-allowed hover:bg-transparent': isNotSelectable,
          },
          className,
        )}
        onClick={() =>
          !isNotSelectable && onMsg({ type: 'on_select_token', token })
        }>
        <TokenIcon chainShowIcon={!token.isIntent} {...token} />

        <div className="gap-ds-sm mr-auto flex flex-col">
          <span className="text-label-m text-gray-50">{token.name}</span>
          {token.isIntent ? (
            <span className="text-label-s text-gray-100">{`${token.symbol} on ${appName} ${token.chainName !== 'Near' ? `(${token.chainName})` : ''}`}</span>
          ) : (
            <span className="text-label-s text-gray-100">{`${token.symbol} on ${token.chainName}`}</span>
          )}
        </div>

        {isTokenSupported && !!ctx.walletAddress && (
          <div className="gap-ds-sm flex flex-col items-end">
            {balance === undefined && !token.isIntent ? (
              <span className="h-[16px] w-[60px] animate-pulse rounded-full bg-gray-700" />
            ) : (
              <span className="text-label-m text-gray-50">
                <TinyNumber
                  decimals={token.decimals}
                  value={balance === undefined ? '0' : `${balance}`}
                />
              </span>
            )}
            {balance !== '0' && balance !== 0 && balance !== undefined && (
              <span className="text-label-s text-gray-100">
                {displayUsdBalance}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
};
