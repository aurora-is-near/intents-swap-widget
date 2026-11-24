import { formatBps, formatCompactUsd } from '../markets/format';
import { formatUsd } from './loanFormat';

/** From here a liquidation price is compact ("$62.5K"), so it fits a tile at 420px. */
const COMPACT_FROM_USD = 10_000;

const formatPrice = (usd: number) =>
  usd >= COMPACT_FROM_USD ? formatCompactUsd(usd) : formatUsd(usd);

/** Hundredths (162n) to "1.62". */
const formatHealth = (hundredths: bigint) =>
  (Number(hundredths) / 100).toFixed(2);

const DASH = '—';

/**
 * A tile (line 368): `sf2`, radius 14, padding 12px 16px; the label 12px
 * `mut2`, the value 26px / 800 / -0.02em, kept on one line.
 */
function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  /** A line under the value, such as the liquidation LTV. */
  note?: string;
}) {
  return (
    <div className="min-w-0 rounded-[14px] bg-sf2 px-[16px] py-[12px] leading-[normal]">
      <dt className="text-[12px] text-mut2">{label}</dt>
      <dd className="m-0">
        <span className="block truncate text-[26px] font-extrabold tracking-[-0.02em]">
          {value}
        </span>
        {note ? (
          <span className="block text-[12px] text-mut2">{note}</span>
        ) : null}
      </dd>
    </div>
  );
}

type LoanSummaryProps = {
  /** Loan-to-value in whole percent. */
  ltv: number;
  /** Dollars per whole collateral token; `undefined` with nothing borrowed. */
  liquidationPriceUsd: number | undefined;
  /** The market's liquidation LTV; `undefined` until a market is known. */
  liquidationLtvBps: number | undefined;
  /** Health in hundredths; `null` at LTV 0, `undefined` without a market. */
  healthHundredths: bigint | null | undefined;
};

/**
 * The three tiles under the markets (Web-Borrow.dc.html lines 366–370), for
 * the selected market: the LTV; the collateral's liquidation price with the
 * liquidation LTV beneath it (decided: both); and health to two decimals,
 * "—" at LTV 0 (line 1173).
 */
export function LoanSummary({
  ltv,
  liquidationPriceUsd,
  liquidationLtvBps,
  healthHundredths,
}: LoanSummaryProps) {
  return (
    // Line 366: three equal columns, gap 10, margin-top 16.
    <dl className="m-0 mt-[16px] grid grid-cols-3 gap-[10px]">
      <Tile label="LTV" value={`${ltv}%`} />
      <Tile
        label="Liquidation"
        note={
          liquidationLtvBps === undefined
            ? undefined
            : `at ${formatBps(liquidationLtvBps)} LTV`
        }
        value={
          liquidationPriceUsd === undefined
            ? DASH
            : formatPrice(liquidationPriceUsd)
        }
      />
      <Tile
        label="Health"
        value={
          healthHundredths === null || healthHundredths === undefined
            ? DASH
            : formatHealth(healthHundredths)
        }
      />
    </dl>
  );
}
