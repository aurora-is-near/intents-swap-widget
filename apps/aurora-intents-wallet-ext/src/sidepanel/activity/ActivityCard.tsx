import { Badge, TokenIcon } from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { AppMark } from '../components/AppMark';
import { Icon, Spinner } from '../components/Icon';
import { chainLabel } from '../screens/transfer/summary';
import { shortAddress } from '../utils';
import type { ActivityItem, ActivityStatus } from './activity';
import { appName } from './appActivity';
import type { AppActivityItem } from './appActivity';
import { dateTimeLabel, groupByDay, KIND_LABELS, timeLabel } from './activity';

const STATUS_LABELS: Record<ActivityStatus, string> = {
  pending: 'Pending',
  success: 'Success',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const ActivityStatusBadge = ({
  status,
  size = 'md',
}: {
  status: ActivityStatus;
  size?: 'md' | 'lg';
}) => (
  <span
    className={cn(
      'flex shrink-0 items-center gap-sw-sm',
      size === 'lg' ? 'text-sw-label-lg' : 'text-sw-label-md',
      status === 'pending' && 'text-sw-accent-500',
      status === 'success' && 'text-sw-status-success',
      (status === 'failed' || status === 'refunded') && 'text-sw-status-error',
    )}>
    {status === 'pending' ? (
      <Spinner size={16} />
    ) : (
      <Icon name={status === 'success' ? 'check' : 'close'} size={16} />
    )}
    {STATUS_LABELS[status]}
  </span>
);

const Side = ({
  token,
  amount,
  caption,
}: {
  token: Token | undefined;
  amount: string;
  caption: string;
}) => (
  <span className="flex min-w-[0px] items-center gap-sw-md">
    {token ? <TokenIcon token={token} className="border-sw-gray-900" /> : null}
    <span className="flex min-w-[0px] flex-col gap-sw-xxs">
      <span className="truncate text-sw-label-md text-sw-gray-50">
        {amount || '—'}
      </span>
      <span className="truncate text-sw-label-sm text-sw-gray-300">
        {caption}
      </span>
    </span>
  </span>
);

/** One swap, deposit or send, as in the design's Activity list. */
const ActivityCard = ({
  item,
  withDay = false,
  onClick,
}: {
  item: ActivityItem;
  /** No day heading above it: say the day next to the time. */
  withDay?: boolean;
  onClick: () => void;
}) => {
  const { from, to } = item;
  const fromCaption =
    item.kind === 'send' && item.recipient
      ? `${from.token?.symbol ?? ''} → ${shortAddress(item.recipient)}`
      : `${from.token?.symbol ?? ''}${
          item.kind === 'deposit' && from.token
            ? ` · ${chainLabel(from.token.blockchain)}`
            : ''
        }`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-sw-lg rounded-sw-lg bg-sw-gray-900 px-sw-xl pb-sw-xl pt-sw-lg text-left transition-colors hover:bg-sw-gray-800">
      <span className="flex items-center justify-between">
        <span className="text-sw-label-md text-sw-gray-200">
          {KIND_LABELS[item.kind]}
        </span>
        <span className="text-sw-label-sm text-sw-gray-400">
          {withDay ? dateTimeLabel(item.createdAt) : timeLabel(item.createdAt)}
        </span>
      </span>
      <span className="flex items-center justify-between gap-sw-md">
        <span className="flex min-w-[0px] items-center gap-[10px]">
          <Side token={from.token} amount={from.amount} caption={fromCaption} />
          {item.kind === 'send' ? null : (
            <>
              <span className="text-sw-label-md text-sw-gray-200">→</span>
              <Side
                token={to.token}
                amount={to.amount}
                caption={to.token?.symbol ?? ''}
              />
            </>
          )}
        </span>
        <ActivityStatusBadge status={item.status} />
      </span>
    </button>
  );
};

/** A deposit into an app, as in the design's Activity — apps list. */
const AppActivityCard = ({
  item,
  withDay = false,
  onClick,
}: {
  item: AppActivityItem;
  withDay?: boolean;
  onClick: () => void;
}) => {
  const { from, to } = item;
  const name = appName(item);
  const outcome = (() => {
    switch (item.status) {
      case 'success':
        return `Credited to ${name}`;
      case 'failed':
        return 'Held in your Intents Connect account';
      default:
        return item.isExpired
          ? 'Expired · a late deposit still completes'
          : 'In progress';
    }
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-sw-lg rounded-sw-lg bg-sw-gray-900 px-sw-xl pb-sw-xl pt-sw-lg text-left transition-colors hover:bg-sw-gray-800">
      <span className="flex items-center justify-between">
        <span className="flex items-center gap-sw-sm text-sw-label-md text-sw-gray-200">
          Deposit
          <Badge className="ml-[0px]">{name}</Badge>
        </span>
        <span className="text-sw-label-sm text-sw-gray-400">
          {withDay ? dateTimeLabel(item.createdAt) : timeLabel(item.createdAt)}
        </span>
      </span>
      <span className="flex items-center justify-between gap-sw-md">
        <span className="flex min-w-[0px] items-center gap-[10px]">
          <Side
            token={from.token}
            amount={from.amount}
            caption={
              from.token
                ? `${from.token.symbol} · ${chainLabel(from.token.blockchain)}`
                : ''
            }
          />
          <span className="text-sw-label-md text-sw-gray-200">→</span>
          <span className="flex min-w-[0px] items-center gap-sw-md">
            {item.app ? <AppMark app={item.app} size={28} /> : null}
            <span className="flex min-w-[0px] flex-col gap-sw-xxs">
              <span className="truncate text-sw-label-md text-sw-gray-50">
                {item.status === 'failed' ? '—' : to.amount || '—'}
              </span>
              <span className="truncate text-sw-label-sm text-sw-gray-300">
                {to.symbol}
              </span>
            </span>
          </span>
        </span>
        <ActivityStatusBadge status={item.status} />
      </span>
      <span
        className={cn(
          'text-sw-label-sm',
          item.status === 'failed'
            ? 'text-sw-status-error'
            : 'text-sw-gray-300',
        )}>
        {outcome}
      </span>
    </button>
  );
};

/** Cards under day headings ("Today", "Yesterday", "28 Sep"). */
const Bar = ({ className }: { className: string }) => (
  <span
    className={cn('block animate-pulse rounded-full bg-sw-gray-800', className)}
  />
);

/** Placeholder cards while the activity loads, shaped like the real ones. */
export const ActivitySkeleton = ({ count = 3 }: { count?: number }) => (
  <div
    className="flex flex-col gap-sw-sm"
    aria-busy="true"
    aria-label="Loading activity">
    {Array.from({ length: count }, (_, index) => (
      <div
        key={index}
        className="flex flex-col gap-sw-lg rounded-sw-lg bg-sw-gray-900 px-sw-xl pb-sw-xl pt-sw-lg">
        <span className="flex items-center justify-between">
          <Bar className="h-[14px] w-[56px]" />
          <Bar className="h-[12px] w-[64px]" />
        </span>
        <span className="flex items-center justify-between">
          <span className="flex items-center gap-sw-md">
            <Bar className="h-[28px] w-[28px]" />
            <span className="flex flex-col gap-sw-xs">
              <Bar className="h-[14px] w-[44px]" />
              <Bar className="h-[12px] w-[32px]" />
            </span>
            <Bar className="ml-sw-md h-[28px] w-[28px]" />
            <span className="flex flex-col gap-sw-xs">
              <Bar className="h-[14px] w-[44px]" />
              <Bar className="h-[12px] w-[32px]" />
            </span>
          </span>
          <Bar className="h-[14px] w-[64px]" />
        </span>
      </div>
    ))}
  </div>
);

/**
 * Cards under day headings ("Today", "Yesterday", "28 Sep"), or with
 * `grouped={false}` a plain list whose cards carry their own day.
 */
type Entry = ActivityItem | AppActivityItem;

const EntryCard = ({
  item,
  withDay,
  onOpen,
}: {
  item: Entry;
  withDay?: boolean;
  onOpen: (item: Entry) => void;
}) =>
  item.kind === 'app' ? (
    <AppActivityCard
      item={item}
      withDay={withDay}
      onClick={() => onOpen(item)}
    />
  ) : (
    <ActivityCard item={item} withDay={withDay} onClick={() => onOpen(item)} />
  );

export const ActivityList = ({
  items,
  grouped = true,
  onOpen,
}: {
  items: Entry[];
  grouped?: boolean;
  onOpen: (item: Entry) => void;
}) =>
  grouped ? (
    <div className="flex flex-col gap-sw-3xl">
      {groupByDay(items).map((group) => (
        <section key={group.label} className="flex flex-col gap-sw-sm">
          <h2 className="px-sw-xs pb-sw-xxs text-sw-label-sm text-sw-gray-100">
            {group.label}
          </h2>
          {group.items.map((item) => (
            <EntryCard key={item.id} item={item} onOpen={onOpen} />
          ))}
        </section>
      ))}
    </div>
  ) : (
    <div className="flex flex-col gap-sw-sm">
      {items.map((item) => (
        <EntryCard key={item.id} item={item} withDay onOpen={onOpen} />
      ))}
    </div>
  );
