import { TokenIcon } from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { Icon, Spinner } from '../components/Icon';
import { chainLabel } from '../screens/transfer/summary';
import { shortAddress } from '../utils';
import type { ActivityItem, ActivityStatus } from './activity';
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

/** Cards under day headings ("Today", "Yesterday", "28 Sep"). */
/**
 * Cards under day headings ("Today", "Yesterday", "28 Sep"), or with
 * `grouped={false}` a plain list whose cards carry their own day.
 */
export const ActivityList = ({
  items,
  grouped = true,
  onOpen,
}: {
  items: ActivityItem[];
  grouped?: boolean;
  onOpen: (item: ActivityItem) => void;
}) =>
  grouped ? (
    <div className="flex flex-col gap-sw-3xl">
      {groupByDay(items).map((group) => (
        <section key={group.label} className="flex flex-col gap-sw-sm">
          <h2 className="px-sw-xs pb-sw-xxs text-sw-label-sm text-sw-gray-100">
            {group.label}
          </h2>
          {group.items.map((item) => (
            <ActivityCard
              key={item.id}
              item={item}
              onClick={() => onOpen(item)}
            />
          ))}
        </section>
      ))}
    </div>
  ) : (
    <div className="flex flex-col gap-sw-sm">
      {items.map((item) => (
        <ActivityCard
          key={item.id}
          item={item}
          withDay
          onClick={() => onOpen(item)}
        />
      ))}
    </div>
  );
