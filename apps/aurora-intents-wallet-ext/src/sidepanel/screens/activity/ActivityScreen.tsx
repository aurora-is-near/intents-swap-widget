import { useState } from 'react';

import { BlockingError, Button } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import type { ActivityKind } from '../../activity/activity';
import { ActivityList, ActivitySkeleton } from '../../activity/ActivityCard';
import { useActivity } from '../../activity/useActivity';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';

type Filter = 'all' | ActivityKind;

// Apps (Polymarket, Gauntlet deposits) arrive with the Apps phase.
const FILTERS: Array<[Filter, string]> = [
  ['all', 'All'],
  ['swap', 'Swaps'],
  ['deposit', 'Deposits'],
  ['send', 'Sends'],
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
          {filter === 'all'
            ? 'Swaps, deposits and sends will show up here.'
            : `Your ${FILTERS.find(([key]) => key === filter)?.[1].toLowerCase() ?? 'activity'} will show up here.`}
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

/** Everything the account swapped, deposited and sent. */
export const ActivityScreen = () => {
  const { back, push } = useNavigation();
  const [filter, setFilter] = useState<Filter>('all');
  const activity = useActivity();

  const items =
    filter === 'all'
      ? activity.items
      : activity.items.filter((item) => item.kind === filter);

  const content = (() => {
    if (activity.isLoading) {
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
            push({ name: 'activityDetail', transaction: item.transaction })
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
        activity.hasNextPage && items.length ? (
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
