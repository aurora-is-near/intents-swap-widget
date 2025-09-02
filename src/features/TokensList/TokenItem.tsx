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
  showBalance?: boolean;
  isNotSelectable?: boolean;
  className?: string;
  onMsg: (msg: Msg) => void;
};

export const TokenItem = ({
  token,
  balance,
  showBalance = true,
  isNotSelectable,
  className,
  onMsg,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { walletSupportedChains, appName } = useConfig();
  const displayUsdBalance = getUsdDisplayBalance(balance, token);
  const isTokenSupported =
    walletSupportedChains.includes(token.blockchain) || token.isIntent;

  const hasBalance = balance !== '0' && balance !== 0 && balance !== undefined;

  return (
    <li className="list-none">
      <div
        className={cn(
          'gap-sw-lg p-sw-lg flex cursor-pointer justify-between rounded-sw-md transition-colors hover:bg-sw-gray-600',
          {
            'cursor-not-allowed hover:bg-transparent': isNotSelectable,
          },
          className,
        )}
        onClick={() =>
          !isNotSelectable && onMsg({ type: 'on_select_token', token })
        }>
        <TokenIcon chainShowIcon={!token.isIntent} {...token} />

        <div className="gap-sw-sm mr-auto flex flex-col">
          <span className="text-sw-label-m text-sw-gray-50">{token.name}</span>
          {token.isIntent ? (
            <div className="flex items-center gap-sw-xs">
              <span className="text-sw-label-s text-sw-gray-100">
                {token.symbol}
              </span>{' '}
              <span className="text-sw-label-s text-sw-gray-200">{`on ${appName} ${token.chainName !== 'Near' ? `(${token.chainName})` : ''}`}</span>
            </div>
          ) : (
            <div className="flex items-center gap-sw-xs">
              <span className="text-sw-label-s text-sw-gray-100">
                {token.symbol}
              </span>{' '}
              <span className="text-sw-label-s text-sw-gray-200">{`on ${token.chainName}`}</span>
            </div>
          )}
        </div>

        {isTokenSupported && !!ctx.walletAddress && showBalance && (
          <div className="gap-sw-sm flex flex-col items-end">
            {balance === undefined && !token.isIntent ? (
              <span className="h-[16px] w-[60px] animate-pulse rounded-full bg-sw-gray-700" />
            ) : (
              <span className="h-[16px] text-sw-label-m text-sw-gray-50">
                {hasBalance && (
                  <TinyNumber
                    decimals={token.decimals}
                    value={balance === undefined ? '0' : `${balance}`}
                  />
                )}
              </span>
            )}
            {hasBalance && (
              <span className="text-sw-label-s text-sw-gray-100">
                {displayUsdBalance}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
};
