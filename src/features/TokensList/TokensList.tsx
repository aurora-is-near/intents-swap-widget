import { VList } from 'virtua';
import { useMemo } from 'react';

import { cn } from '@/utils/cn';
import { Hr } from '@/components/Hr';
import { Banner } from '@/components/Banner';
import { useUnsafeSnapshot } from '@/machine/snap';
import { useMergedBalance } from '@/hooks/useMergedBalance';
import { useTokensFiltered } from '@/hooks/useTokensFiltered';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';
import { useTypedTranslation } from '@/localisation';
import { useConfig } from '@/config';

import type { Chains, DefaultChainsFilter } from '@/types/chain';
import type { Token } from '@/types/token';

import { TOKEN_ITEM_HEIGHT, TokenItem } from './TokenItem';
import { TokensListPlaceholder } from './TokensListPlaceholder';

type Msg =
  | { type: 'on_select_token'; token: Token }
  | { type: 'on_reset_search' };

type Props = {
  search: string;
  groupTokens: boolean;
  showBalances: boolean;
  chainsFilter: DefaultChainsFilter;
  selectedChain: 'all' | 'intents' | Chains;
  chainIsNotSupported: boolean;
  className?: string;
  onMsg: (msg: Msg) => void;
};

const useListState = (tokens: ReadonlyArray<Token>, search: string) => {
  if (tokens.length === 0 && search) {
    return 'EMPTY_SEARCH';
  }

  if (tokens.length === 0 && !search) {
    return 'NO_TOKENS';
  }

  return 'HAS_TOKENS';
};

export const TokensList = ({
  search,
  className,
  groupTokens,
  showBalances,
  chainsFilter,
  selectedChain,
  chainIsNotSupported,
  onMsg,
}: Props) => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { walletSupportedChains, appName } = useConfig();
  const { mergedBalance } = useMergedBalance();

  const filteredTokens = useTokensFiltered({
    search,
    chainsFilter,
    selectedChain,
    walletSupportedChains,
  });

  const areTokensGrouped = ctx.walletAddress ? groupTokens : false;
  const tokensListState = useListState(filteredTokens.all, search);

  const tokensUngrouped = useMemo(
    () => [{ label: null, tokens: filteredTokens.all }],
    [filteredTokens.all],
  );

  const tokensBySection = useMemo(
    () => [
      { label: `${appName} account`, tokens: filteredTokens.intents },
      {
        label: chainIsNotSupported ? null : 'Connected wallet',
        tokens: filteredTokens.wallet,
      },
    ],
    [filteredTokens.wallet, filteredTokens.intents, chainIsNotSupported],
  );

  const tokensCount = useMemo(() => {
    return (areTokensGrouped ? tokensBySection : tokensUngrouped).reduce(
      (acc, group) => acc + group.tokens.length,
      0,
    );
  }, [tokensBySection, tokensUngrouped, areTokensGrouped]);

  // <offset> - user defined offset e.g. page header height + space
  // 152px - height of TokenModal elements like search and paddings
  // 48px - minimal offset from the bottom screen edge
  // Total: 152 + 48 = 200px
  // const maxHeight = `calc(100vh - (${topScreenOffset ?? '0px'} + ${offset ?? '0px'} + 200px))`;
  const maxHeight = '450px';

  switch (tokensListState) {
    case 'EMPTY_SEARCH':
      return (
        <TokensListPlaceholder
          className="pt-sw-5xl pb-sw-5xl"
          onResetSearch={() => onMsg({ type: 'on_reset_search' })}
        />
      );

    case 'HAS_TOKENS':
      return (
        <div className={cn('gap-sw-lg flex flex-col', className)}>
          <VList
            className="hide-scrollbar"
            style={{
              maxHeight,
              minHeight: 200,
              height: tokensCount
                ? tokensCount * TOKEN_ITEM_HEIGHT +
                  (areTokensGrouped ? tokensBySection.length * 40 : 0)
                : TOKEN_ITEM_HEIGHT * 2,
            }}>
            {(areTokensGrouped ? tokensBySection : tokensUngrouped).map(
              ({ label, tokens: tokensToDisplay }) => (
                <>
                  {tokensToDisplay.length && label ? (
                    <header className="pb-sw-lg flex flex-col">
                      <Hr />
                      <span className="text-sw-label-s pt-sw-xl text-sw-gray-100">{`${label} — ${tokensToDisplay.length}`}</span>
                    </header>
                  ) : null}

                  {tokensToDisplay.map((token) => {
                    const tokenBalanceKey = getTokenBalanceKey(token);

                    return (
                      <TokenItem
                        token={token}
                        key={tokenBalanceKey}
                        showBalance={showBalances}
                        balance={mergedBalance[tokenBalanceKey]}
                        isNotSelectable={
                          chainIsNotSupported && !!ctx.walletAddress
                        }
                        onMsg={onMsg}
                      />
                    );
                  })}

                  {tokensToDisplay.length ? <div className="h-sw-2xl" /> : null}
                </>
              ),
            )}
          </VList>
        </div>
      );

    case 'NO_TOKENS':
    default:
      return (
        <Banner
          variant="info"
          message={t('tokens.list.noBalanceOnApp.label', {
            defaultValue: 'No balances available on the {{appName}}',
            appName,
          })}
        />
      );
  }
};
