import { VList, VListHandle } from 'virtua';
import { useMemo, useRef, useState } from 'react';

import { TokenItem } from './TokenItem';
import { TokensListPlaceholder } from './TokensListPlaceholder';
import { LIST_CONTAINER_ID, MAX_LIST_VIEW_AREA_HEIGHT } from './constants';
import { useFocusOnList, useListState } from './hooks';
import {
  getFirstGroupItemTotalIndex,
  getGroupHeadersTotalIndexes,
  getListItemsTotalCount,
  getListState,
  getListTotalHeight,
  getResetInitialScrollFn,
} from './utils';
import type { ListGroup } from './types';

import { cn } from '@/utils/cn';
import { Hr } from '@/components/Hr';
import { useUnsafeSnapshot } from '@/machine/snap';
import { useMergedBalance } from '@/hooks/useMergedBalance';
import { useTokensFiltered } from '@/hooks/useTokensFiltered';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';
import { useTypedTranslation } from '@/localisation';
import { useConfig } from '@/config';

import type { Chains, ChainsFilter } from '@/types/chain';
import type { Token } from '@/types/token';

type Msg =
  | { type: 'on_select_token'; token: Token }
  | { type: 'on_reset_search' };

type Props = {
  variant: 'source' | 'target';
  search: string;
  groupTokens: boolean;
  showBalances: boolean;
  chainsFilter: ChainsFilter;
  selectedChain: 'all' | 'intents' | Chains;
  chainIsNotSupported: boolean;
  className?: string;
  onMsg: (msg: Msg) => void;
};

export const TokensList = ({
  variant,
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
    variant,
    search,
    chainsFilter,
    selectedChain,
    walletSupportedChains,
  });

  const areTokensGrouped = ctx.walletAddress ? groupTokens : false;
  const tokensListState = getListState(filteredTokens.all, search);

  const ref = useRef<VListHandle>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const tokensUngrouped = useMemo<ListGroup<1>>(
    () => [{ tokens: filteredTokens.all }],
    [filteredTokens.all],
  );

  const tokensBySection = useMemo(() => {
    return [
      ...(filteredTokens.intents.length > 0
        ? [
            { label: appName, count: filteredTokens.intents.length },
            { tokens: filteredTokens.intents },
          ]
        : []),
      ...(filteredTokens.wallet.length > 0
        ? [
            {
              label: chainIsNotSupported ? null : 'Connected wallet',
              count: filteredTokens.wallet.length,
            },
            { tokens: filteredTokens.wallet },
          ]
        : []),
    ].filter(Boolean) as ListGroup<0 | 2 | 4>;
  }, [filteredTokens.wallet, filteredTokens.intents, chainIsNotSupported]);

  const tokensList = areTokensGrouped ? tokensBySection : tokensUngrouped;

  const listHeight = getListTotalHeight(tokensList);
  const totalItems = getListItemsTotalCount(tokensList);
  const headerIndexes = getGroupHeadersTotalIndexes(tokensList);

  useFocusOnList({
    listRef: ref.current,
    initialFocusedIndex: areTokensGrouped ? 1 : 0,
    onFocus: (index) => setFocusedIndex(index),
    onBlur: () => setFocusedIndex(-1),
  });

  switch (tokensListState) {
    case 'EMPTY_SEARCH':
      return (
        <TokensListPlaceholder
          hasAction
          actionType="outlined"
          actionLabel={t('tokens.list.searchReset.label', 'Clear search')}
          heading={t('tokens.list.searchEmpty.label', 'No results')}
          subHeading={t(
            'tokens.list.searchEmpty.subLabel',
            'Try another search or check if a specific network is selected.',
          )}
          className="pt-sw-5xl pb-sw-5xl"
          onClick={() => onMsg({ type: 'on_reset_search' })}
        />
      );

    case 'HAS_TOKENS':
      return (
        <div className={cn('gap-sw-lg flex flex-col', className)}>
          <VList
            ref={ref}
            tabIndex={0}
            id={LIST_CONTAINER_ID}
            className="hide-scrollbar"
            style={{
              minHeight: 200,
              height: listHeight,
              maxHeight: MAX_LIST_VIEW_AREA_HEIGHT,
              outline: 'none',
            }}
            // hack: to avoid scrolling on initial focus
            onScroll={getResetInitialScrollFn(ref.current, focusedIndex)}
            onKeyDown={(e) => {
              if (!ref.current) {
                return;
              }

              switch (e.code) {
                case 'ArrowUp': {
                  e.preventDefault();
                  let prevIndex = Math.max(focusedIndex - 1, 0);

                  if (areTokensGrouped && headerIndexes.includes(prevIndex)) {
                    prevIndex = prevIndex === 0 ? 1 : prevIndex - 1;
                  }

                  setFocusedIndex(prevIndex);
                  ref.current?.scrollToIndex(prevIndex, { align: 'nearest' });
                  break;
                }

                case 'ArrowDown': {
                  e.preventDefault();
                  let nextIndex = Math.min(focusedIndex + 1, totalItems - 1);

                  if (areTokensGrouped && headerIndexes.includes(nextIndex)) {
                    nextIndex = nextIndex === 0 ? 1 : nextIndex + 1;
                  }

                  setFocusedIndex(nextIndex);
                  ref.current?.scrollToIndex(nextIndex, { align: 'nearest' });
                  break;
                }

                case 'Enter': {
                  e.preventDefault();
                  const token = tokensUngrouped[0]?.tokens?.[focusedIndex];

                  if (token) {
                    onMsg({ type: 'on_select_token', token });
                  }

                  break;
                }

                default:
                  break;
              }
            }}>
            {tokensList.map(
              ({ label, count, tokens: tokensToDisplay }, groupIndex) => {
                const firstItemInGroupIndex = getFirstGroupItemTotalIndex(
                  tokensList,
                  groupIndex,
                );

                if (label !== undefined) {
                  if (!label) {
                    // must be rendered for calculations even if label is null
                    return <header key={groupIndex} />;
                  }

                  return (
                    <header
                      key={label}
                      className="pb-sw-lg pt-sw-sm flex flex-col">
                      <Hr />
                      <span className="text-sw-label-sm pt-sw-xl text-sw-gray-100">{`${label} — ${count}`}</span>
                    </header>
                  );
                }

                if (tokensToDisplay) {
                  return tokensToDisplay.map((token, tokenIndex) => {
                    const tokenBalanceKey = getTokenBalanceKey(token);

                    return (
                      <TokenItem
                        token={token}
                        key={tokenBalanceKey}
                        showBalance={showBalances}
                        balance={mergedBalance[tokenBalanceKey]}
                        isFocused={
                          focusedIndex === firstItemInGroupIndex + tokenIndex
                        }
                        isNotSelectable={
                          chainIsNotSupported && !!ctx.walletAddress
                        }
                        onMsg={onMsg}
                      />
                    );
                  });
                }

                return null;
              },
            )}
          </VList>
        </div>
      );

    case 'NO_TOKENS':
    default:
      return (
        <TokensListPlaceholder
          className="pt-sw-5xl pb-sw-5xl"
          subHeading={t(
            'tokens.list.noBalanceOnApp.subLabel',
            'Deposit funds to get started',
          )}
          heading={t('tokens.list.noBalanceOnApp.label', {
            defaultValue: 'You have no balances on {{appName}}',
            appName,
          })}
        />
      );
  }
};
