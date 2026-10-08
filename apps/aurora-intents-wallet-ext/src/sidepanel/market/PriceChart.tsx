import { useId, useMemo, useState } from 'react';
import type { PointerEvent } from 'react';

import type { PricePoint } from './coingecko';
import { formatPrice } from './format';

const WIDTH = 360;
const HEIGHT = 160;
// Room above the high and below the low for their labels.
const PAD_Y = 22;

type Props = {
  points: PricePoint[];
  /** The point under the pointer, or null when it leaves. */
  onHover: (point: PricePoint | null) => void;
};

/** A price line over time, like a wallet's asset chart. */
export const PriceChart = ({ points, onHover }: Props) => {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const shape = useMemo(() => {
    const prices = points.map(([, price]) => price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    const step = WIDTH / Math.max(points.length - 1, 1);

    const coords = points.map(([, price], index) => ({
      x: index * step,
      y: PAD_Y + (1 - (price - min) / span) * (HEIGHT - PAD_Y * 2),
    }));

    const line = coords
      .map(
        ({ x, y }, index) =>
          `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`,
      )
      .join(' ');

    return {
      coords,
      line,
      area: `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`,
      min: { value: min, index: prices.indexOf(min) },
      max: { value: max, index: prices.indexOf(max) },
    };
  }, [points]);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      Math.max((event.clientX - box.left) / box.width, 0),
      1,
    );

    const index = Math.round(ratio * (points.length - 1));

    setActive(index);
    onHover(points[index] ?? null);
  };

  const onPointerLeave = () => {
    setActive(null);
    onHover(null);
  };

  // Labels sit over the chart in % so they follow its width.
  const label = (index: number) => {
    const ratio = index / Math.max(points.length - 1, 1);

    return ratio > 0.8
      ? { right: `${(1 - ratio) * 100}%` }
      : { left: `${Math.max(ratio * 100 - 4, 0)}%` };
  };

  const point = active !== null ? shape.coords[active] : undefined;

  // A narrow range (a stablecoin, say) needs more than cents to tell the
  // high from the low.
  const isNarrow = shape.max.value - shape.min.value < 0.05;
  const edgeLabel = (value: number) =>
    isNarrow && value >= 0.01 ? `$${value.toFixed(4)}` : formatPrice(value);

  return (
    <div
      role="img"
      aria-label="Price chart"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative -mx-sw-xl h-[160px] touch-none select-none text-sw-accent-400">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="block h-full w-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={shape.area} fill={`url(#${gradientId})`} />
        <path
          d={shape.line}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {point ? (
          <line
            x1={point.x}
            x2={point.x}
            y1={0}
            y2={HEIGHT}
            stroke="var(--c-sw-gray-500, #6b6f7b)"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
      {point && active !== null ? (
        <span
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-sw-sm bg-sw-gray-800 px-sw-sm py-sw-xxs text-sw-label-sm text-sw-gray-50 shadow-sm"
          style={{
            // Kept inside the chart near the edges.
            left: `${Math.min(Math.max((point.x / WIDTH) * 100, 12), 88)}%`,
            top: `${Math.max((point.y / HEIGHT) * 100 - 24, 0)}%`,
          }}>
          {edgeLabel(points[active]?.[1] ?? 0)}
        </span>
      ) : null}
      {point ? (
        <span
          className="pointer-events-none absolute h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sw-gray-950 bg-sw-accent-400"
          style={{
            left: `${(point.x / WIDTH) * 100}%`,
            top: `${(point.y / HEIGHT) * 100}%`,
          }}
        />
      ) : null}
      {/* The hovered price replaces the high and low while it's shown. */}
      {point ? null : (
        <>
          <span
            className="pointer-events-none absolute top-[0px] text-sw-label-sm text-sw-gray-300"
            style={label(shape.max.index)}>
            {edgeLabel(shape.max.value)}
          </span>
          <span
            className="pointer-events-none absolute bottom-[0px] text-sw-label-sm text-sw-gray-300"
            style={label(shape.min.index)}>
            {edgeLabel(shape.min.value)}
          </span>
        </>
      )}
    </div>
  );
};
