import { useState } from 'react';

import {
  Button,
  CopyButton,
  getTokenBalanceKey,
  Notes,
} from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import { cn, formatUsdAmount } from '@aurora-is-near/intents-swap-widget/utils';

import { involvesToken } from '../../activity/activity';
import { ActivityList, ActivitySkeleton } from '../../activity/ActivityCard';
import { useActivity } from '../../activity/useActivity';
import { useTransferSource } from '../../accounts/useTransferSource';
import { ActionButton } from '../../components/ActionButton';
import { Screen } from '../../components/Screen';
import { Tabs } from '../../components/Tabs';
import { TokenWithChain } from '../../components/TokenWithChain';
import { useAccountAssets } from '../../home/useAccountAssets';
import { CoinGeckoError } from '../../market/coingecko';
import type { ChartRange, PricePoint } from '../../market/coingecko';
import {
  formatChange,
  formatCompact,
  formatCompactUsd,
  formatPrice,
} from '../../market/format';
import { PriceChart } from '../../market/PriceChart';
import { useCoin, usePriceChart } from '../../market/useMarket';
import { useNavigation } from '../../navigation';
import { shortAddress } from '../../utils';
import { InlineChain } from '../transfer/InlineAsset';
import { chainLabel, formatTokenAmount } from '../transfer/summary';
import { NotesCard } from '../transfer/TransferStatus';

/** Latest items in "Your activity"; the rest is on the Activity screen. */
const ACTIVITY_PREVIEW = 5;

const RANGES = [
  ['1D', '1D'],
  ['1W', '1W'],
  ['1M', '1M'],
  ['3M', '3M'],
  ['1Y', '1Y'],
  ['All', 'All'],
] as const;

const RANGE_LABELS: Record<ChartRange, string> = {
  '1D': 'Today',
  '1W': 'Past week',
  '1M': 'Past month',
  '3M': 'Past 3 months',
  '1Y': 'Past year',
  All: 'All time',
};

const formatMoment = (timestamp: number, range: ChartRange) =>
  new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(range === '1D' || range === '1W'
      ? { hour: 'numeric', minute: '2-digit' }
      : { year: 'numeric' }),
  });

const changeBetween = (from: number | undefined, to: number | undefined) =>
  from && to ? ((to - from) / from) * 100 : null;

const Change = ({ value }: { value: number | null }) =>
  value === null ? null : (
    <span
      className={cn(
        value < 0 ? 'text-sw-status-error' : 'text-sw-status-success',
      )}>
      {formatChange(value)}
    </span>
  );

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="flex shrink-0 flex-col gap-sw-md">
    <h2 className="px-sw-xs text-sw-label-md text-sw-gray-50">{title}</h2>
    {children}
  </section>
);

/** Why there's no chart: not listed, rate limited, or offline. */
const chartUnavailable = (error: unknown, isListed: boolean) => {
  if (error instanceof CoinGeckoError && error.status === 429) {
    return 'Price history is busy right now. Try again in a minute.';
  }

  if (error) {
    return 'Couldn’t load the price history.';
  }

  return isListed ? null : 'No price history for this token.';
};

/** A token's price, chart, balance and details, opened from Home. */
export const AssetScreen = ({ token }: { token: Token }) => {
  const { back, push } = useNavigation();
  const assets = useAccountAssets();
  const [range, setRange] = useState<ChartRange>('1D');
  const [hovered, setHovered] = useState<PricePoint | null>(null);

  const activity = useActivity();
  const tokenActivity = activity.items.filter((item) =>
    involvesToken(item, token),
  );

  const coin = useCoin(token);
  const chart = usePriceChart(coin.data?.id, range);
  const market = coin.data?.market_data;
  const points = chart.data ?? [];

  const key = getTokenBalanceKey(token);
  const held = [...assets.account, ...assets.wallet].find(
    (asset) => getTokenBalanceKey(asset.token) === key,
  );

  const first = points[0]?.[1];
  // 1D: CoinGecko's own 24h change, as in the balance row.
  const rangeChange =
    (range === '1D' ? market?.price_change_percentage_24h : null) ??
    changeBetween(first, points[points.length - 1]?.[1]);

  const shownPrice = hovered ? hovered[1] : token.price;
  const shownChange = hovered ? changeBetween(first, hovered[1]) : rangeChange;

  const unavailable = chartUnavailable(
    coin.error ?? chart.error,
    coin.data !== null,
  );

  const isChartLoading =
    coin.isPending || (!!coin.data && chart.isPending && !chart.error);

  // On-chain tokens are the spending wallet's: the account's own or a secondary.
  const { wallet } = useTransferSource();
  const heldIn = token.isIntent ? 'Your account' : (wallet?.name ?? 'Wallet');

  return (
    <Screen title={token.symbol} onBack={back}>
      {/* Own gap: Screen's default can't be overridden through className.
          Blocks 24px apart; the actions row 48px (gap + its own padding). */}
      <div className="flex flex-col gap-sw-3xl">
        <div className="flex shrink-0 flex-col gap-sw-2xl">
          <div className="flex shrink-0 flex-col gap-sw-lg">
            <div className="flex items-center gap-sw-lg">
              <TokenWithChain token={token} />
              <div className="flex min-w-[0px] flex-col gap-sw-xs">
                <span className="truncate text-sw-label-md text-sw-gray-50">
                  {coin.data?.name ?? token.name}
                </span>
                <span className="text-sw-label-sm text-sw-gray-300">
                  on {chainLabel(token.blockchain)}
                  {token.isIntent ? ' · in your account' : ''}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-sw-sm">
              <span className="text-sw-value-lg text-sw-gray-50">
                {formatPrice(shownPrice)}
              </span>
              <span className="flex gap-sw-md text-sw-label-sm text-sw-gray-300">
                <Change value={shownChange} />
                <span>
                  {hovered
                    ? formatMoment(hovered[0], range)
                    : RANGE_LABELS[range]}
                </span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-sw-lg">
            {isChartLoading ? (
              <div className="h-[160px] animate-pulse rounded-sw-lg bg-sw-gray-900" />
            ) : null}
            {!isChartLoading && unavailable ? (
              <div className="flex h-[160px] items-center justify-center rounded-sw-lg bg-sw-gray-900 px-sw-xl text-center text-sw-body-sm text-sw-gray-300">
                {unavailable}
              </div>
            ) : null}
            {!isChartLoading && !unavailable && points.length > 1 ? (
              <PriceChart points={points} onHover={setHovered} />
            ) : null}
            <Tabs
              label="Chart range"
              tabs={RANGES}
              value={range}
              onChange={(next) => {
                setHovered(null);
                setRange(next);
              }}
            />
          </div>
        </div>

        <nav aria-label="Actions" className="flex shrink-0 gap-sw-md py-sw-3xl">
          <ActionButton
            icon="deposit"
            label="Receive"
            onClick={() => push({ name: 'deposit' })}
          />
          <ActionButton
            icon="send"
            label="Send"
            onClick={() => push({ name: 'send', source: token })}
          />
          <ActionButton
            icon="swap"
            label="Swap"
            onClick={() => push({ name: 'swap', source: token })}
          />
        </nav>

        <Section title="Your balance">
          <div className="flex items-center gap-sw-lg rounded-sw-lg bg-sw-gray-900 p-sw-xl">
            <TokenWithChain token={token} />
            <div className="flex min-w-[0px] grow flex-col gap-sw-xs">
              <span className="truncate text-sw-label-md text-sw-gray-50">
                {coin.data?.name ?? token.name}
              </span>
              <span className="text-sw-label-sm">
                <Change value={market?.price_change_percentage_24h ?? null} />
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-sw-xs">
              <span className="text-sw-label-md text-sw-gray-50">
                {formatUsdAmount(held?.usd ?? 0)}
              </span>
              <span className="text-sw-label-sm text-sw-gray-300">
                {formatTokenAmount(held?.balance, token) || '0'} {token.symbol}
              </span>
            </div>
          </div>
        </Section>

        <Section title="Token details">
          <NotesCard>
            <Notes.Item
              label="Network"
              value={<InlineChain chain={token.blockchain} />}
            />
            <Notes.Item label="Held in" value={heldIn} />
            {token.contractAddress ? (
              <Notes.Item
                label="Contract address"
                value={
                  <span className="flex items-center gap-sw-sm">
                    {shortAddress(token.contractAddress)}
                    <CopyButton value={token.contractAddress} />
                  </span>
                }
              />
            ) : null}
          </NotesCard>
        </Section>

        {market ? (
          <Section title="Market details">
            <NotesCard>
              <Notes.Item
                label="Market cap"
                value={formatCompactUsd(market.market_cap?.usd)}
              />
              <Notes.Item
                label="Total volume"
                value={formatCompactUsd(market.total_volume?.usd)}
              />
              <Notes.Item
                label="Circulating supply"
                value={formatCompact(market.circulating_supply)}
              />
              <Notes.Item
                label="All-time high"
                value={
                  market.ath?.usd !== undefined
                    ? formatPrice(market.ath.usd)
                    : undefined
                }
              />
              <Notes.Item
                label="All-time low"
                value={
                  market.atl?.usd !== undefined
                    ? formatPrice(market.atl.usd)
                    : undefined
                }
              />
            </NotesCard>
          </Section>
        ) : null}

        <Section title="Your activity">
          {(() => {
            if (activity.isLoading) {
              return <ActivitySkeleton count={2} />;
            }

            if (!tokenActivity.length) {
              return (
                <p className="px-sw-xs text-sw-body-sm text-sw-gray-300">
                  No {token.symbol} activity yet.
                </p>
              );
            }

            return (
              <>
                <ActivityList
                  grouped={false}
                  items={tokenActivity.slice(0, ACTIVITY_PREVIEW)}
                  onOpen={(item) =>
                    push({
                      name: 'activityDetail',
                      transaction: item.transaction,
                    })
                  }
                />
                {tokenActivity.length > ACTIVITY_PREVIEW ? (
                  <Button
                    variant="outlined"
                    size="md"
                    fluid
                    onClick={() => push({ name: 'activity' })}>
                    See all activity
                  </Button>
                ) : null}
              </>
            );
          })()}
        </Section>
      </div>
    </Screen>
  );
};
