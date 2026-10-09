import { useMemo, useState } from 'react';

import {
  BlockingError,
  Button,
  useTokens,
} from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import type { ActivityFilter } from '../../activity/activity';
import { ActivityList, ActivitySkeleton } from '../../activity/ActivityCard';
import { toAppActivityItem } from '../../activity/appActivity';
import { useActivity } from '../../activity/useActivity';
import { useAppsRuntime } from '../../apps/AppsRuntime';
import { useAppExecutions } from '../../apps/useAppExecutions';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';

type Filter = ActivityFilter;

const FILTERS: Array<[Filter, string]> = [
  ['all', 'All'],
  ['swap', 'Swaps'],
  ['deposit', 'Deposits'],
  ['send', 'Sends'],
  ['apps', 'Apps'],
];

const Empty = ({
  filter,
  onDeposit,
}: {
  filter: Filter;
  onDeposit: () => void;
}) => (
  <>
    <div className="flex flex-col items-center gap-sw-xl px-sw-md pb-sw-3xl pt-sw-5xl text-center">
      <div className="flex h-[56px] w-[56px] items-center justify-center rounded-sw-lg bg-sw-gray-900 text-sw-gray-300">
        <Icon name="activity" size={28} />
      </div>
      <div className="flex flex-col items-center gap-sw-md">
        <h2 className="text-sw-h5 text-sw-gray-50">
          {filter === 'all' ? 'No activity yet' : 'Nothing here yet'}
        </h2>
        <p className="max-w-[300px] text-sw-body-md text-sw-gray-200">
          {(() => {
            switch (filter) {
              case 'all':
                return 'Swaps, deposits, sends and app deposits will show up here.';
              case 'apps':
                return 'Deposits into apps like Polymarket will show up here.';
              default:
                return `Your ${FILTERS.find(([key]) => key === filter)?.[1].toLowerCase() ?? 'activity'} will show up here.`;
            }
          })()}
        </p>
      </div>
    </div>
    {filter === 'all' ? (
      <Button variant="primary" size="md" fluid onClick={onDeposit}>
        Make a deposit
      </Button>
    ) : null}
  </>
);

/** Everything the account swapped, deposited and sent, and its app deposits. */
export const ActivityScreen = ({
  initialFilter = 'all',
}: {
  initialFilter?: Filter;
}) => {
  const { back, push } = useNavigation();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const activity = useActivity();
  const { tokens } = useTokens();
  const hasApps = !!useAppsRuntime();
  const apps = useAppExecutions();

  const appItems = useMemo(
    () =>
      apps.executions.map((execution) => toAppActivityItem(tokens, execution)),
    [apps.executions, tokens],
  );

  const items = (() => {
    switch (filter) {
      case 'all':
        return [...activity.items, ...appItems].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
      case 'apps':
        return appItems;
      default:
        return activity.items.filter((item) => item.kind === filter);
    }
  })();

  const isLoading = filter === 'apps' ? apps.isLoading : activity.isLoading;

  const content = (() => {
    if (filter === 'apps' && !hasApps) {
      return (
        <p className="m-0 px-sw-xs py-sw-lg text-sw-body-md text-sw-gray-300">
          App deposits need a wallet account Intents Connect can sign with.
        </p>
      );
    }

    if (isLoading) {
      return <ActivitySkeleton />;
    }

    if (activity.isError && !activity.items.length) {
      return (
        <BlockingError
          message="Couldn't load your activity."
          onClickRetry={() => {
            activity.refetch().catch(() => undefined);
          }}
        />
      );
    }

    if (!items.length) {
      return (
        <Empty filter={filter} onDeposit={() => push({ name: 'deposit' })} />
      );
    }

    return (
      <>
        <ActivityList
          items={items}
          onOpen={(item) =>
            item.kind === 'app'
              ? push({ name: 'appExecution', executionId: item.id })
              : push({ name: 'activityDetail', transaction: item.transaction })
          }
        />
      </>
    );
  })();

  return (
    <Screen
      title="Activity"
      onBack={back}
      footer={
        // Pinned to the bottom like the other screens' main actions.
        activity.hasNextPage && items.length && filter !== 'apps' ? (
          <Button
            variant="outlined"
            size="lg"
            state={activity.isFetchingNextPage ? 'loading' : 'default'}
            onClick={() => {
              activity.fetchNextPage().catch(() => undefined);
            }}>
            Load more
          </Button>
        ) : null
      }>
      <div className="flex flex-col gap-sw-lg">
        <div role="tablist" aria-label="Filter" className="flex gap-sw-sm">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full px-sw-lg py-sw-sm text-sw-label-sm transition-colors',
                filter === key
                  ? 'bg-sw-gray-50 text-sw-gray-950'
                  : 'bg-sw-gray-800 text-sw-gray-100 hover:bg-sw-gray-700',
              )}>
              {label}
            </button>
          ))}
        </div>
        {content}
      </div>
    </Screen>
  );
};
