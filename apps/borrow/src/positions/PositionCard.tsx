import { Banner, Button, Card } from '@aurora-is-near/ui-kit';
import { useId } from 'react';

import { DoneMark } from '../loan/DoneMark';
import { LtvBar } from '../loan/LtvBar';
import { formatUsd } from '../loan/loanFormat';
import { formatBps } from '../markets/format';
import {
  DASH,
  formatHealth,
  formatLtv,
  formatOptionalApr,
  formatUsdCents,
  healthTone,
  largestReserve,
  pillLabel,
  reservesLabel,
  riskText,
} from './positionFormat';
import type { LoanPosition, PositionAsset } from './types';

/*
 * Web-Positions-Multi.dc.html lines 401–434 (`posActive`) and
 * Web-Repaid.dc.html lines 487–503 (`posRepaid`). Mob-* artboards share the
 * markup: below 640px only the card's padding changes (16px, from `Card`),
 * and the tile grids reflow by their `auto-fit` columns.
 */

/** The `.lbl` caption (line 145): 12px, tracking 0.14em, `mut2`. */
const CAPTION =
  'font-sans text-[12px] leading-[normal] tracking-[0.14em] text-mut2';

/** Lines 416–417: `sf2`, radius 18, padding 16px 18px. */
const BIG_TILE = 'min-w-0 rounded-[18px] bg-sf2 px-[18px] py-[16px]';

/** Lines 416–417: the tiles' 13px `mut2` lines. */
const TILE_NOTE = 'text-[13px] text-mut2';

/** `bps` from a fraction, rounded so 0.825 reads 8250, not 8250.000…1. */
const toBps = (fraction: number) => Math.round(fraction * 10_000);

/** The loan's name for assistive technology: "WETH → USDC, Aave V3 on Base". */
const loanName = (position: LoanPosition) => {
  const pair = [position.collateral, position.debt]
    .map((assets) => largestReserve(assets)?.symbol)
    .filter((symbol) => symbol !== undefined)
    .join(' → ');

  const market = `${position.marketName} on ${position.chainLabel}`;

  return pair ? `${pair}, ${market}` : market;
};

/**
 * A Collateral or Debt tile (lines 416–417): the largest reserve in 30px /
 * 800 / -0.03em at line-height 1.15, with "+N more"; the dollar total and the
 * chain under it.
 */
function ReservesTile({
  label,
  assets,
  usd,
  chain,
  size = 'md',
}: {
  label: string;
  assets: readonly PositionAsset[];
  usd: number;
  chain: string;
  /** `lg` is the repaid card's 32px figure (Web-Repaid.dc.html line 493). */
  size?: 'md' | 'lg';
}) {
  const { amount, more } = reservesLabel(assets);

  return (
    <div className={`${BIG_TILE} leading-[normal]`}>
      <dt className={TILE_NOTE}>{label}</dt>
      <dd className="m-0">
        <span
          className={`block font-extrabold tracking-[-0.03em] break-words ${
            size === 'lg' ? 'text-[32px]' : 'text-[30px] leading-[1.15]'
          }`}>
          {amount}
          {more ? (
            <span className="ml-[8px] text-[13px] font-semibold tracking-normal text-mut2">
              {more}
            </span>
          ) : null}
        </span>
        <span className={`block ${TILE_NOTE}`}>
          ≈ {formatUsd(usd)} · {chain}
        </span>
      </dd>
    </div>
  );
}

/**
 * A stat tile (lines 427–431): `sf2`, radius 14, padding 12px 16px; the label
 * 12px `mut2`, the value 26px / 800 / -0.02em.
 */
function StatTile({
  label,
  value,
  tone = 'text-ink',
}: {
  label: string;
  value: string;
  /** The value's colour class. */
  tone?: string;
}) {
  return (
    <div className="min-w-0 rounded-[14px] bg-sf2 px-[16px] py-[12px] leading-[normal]">
      <dt className="text-[12px] text-mut2">{label}</dt>
      <dd
        className={`m-0 text-[26px] font-extrabold tracking-[-0.02em] break-words ${tone}`}>
        {value}
      </dd>
    </div>
  );
}

/**
 * The `market · APR` pill (line 406): `tint`, 1.5px `limebd` border, radius
 * 999, padding 5px 12px, 13px / 700, with a 7px `#5E9E12` dot (a literal on
 * the artboard, with no token).
 */
function MarketPill({ position }: { position: LoanPosition }) {
  return (
    <span className="inline-flex items-center gap-[8px] rounded-full border-[1.5px] border-solid border-limebd bg-tint px-[12px] py-[5px] text-[13px] leading-[normal] font-bold">
      <span
        aria-hidden="true"
        className="inline-block size-[7px] rounded-full bg-[#5E9E12]"
      />
      {pillLabel(position)}
    </span>
  );
}

/**
 * "Close to liquidation" (lines 408–414): the kit's tinted danger banner,
 * announced at once (`role="alert"`), 16px under the header. Add collateral
 * (`.seg.sel`) and Repay part (`.seg`) are drawn disabled (`.seg:disabled`,
 * opacity .45) until those features ship (decided), and left out for a
 * read-only loan.
 */
function RiskBanner({ position }: { position: LoanPosition }) {
  return (
    <Banner
      className="mt-[16px]"
      title="Close to liquidation"
      tinted
      tone="danger">
      {riskText(position)}
      {position.manageable ? (
        <div className="mt-[12px] flex flex-wrap gap-[8px]">
          <Button
            className="border-ink bg-ink text-sf disabled:opacity-45"
            disabled
            variant="secondary">
            Add collateral
          </Button>
          <Button className="disabled:opacity-45" disabled variant="secondary">
            Repay part
          </Button>
        </div>
      ) : null}
    </Banner>
  );
}

/** An active or at-risk loan (`posActive`, lines 403–434). */
function ActiveLoanCard({ position }: { position: LoanPosition }) {
  const ltvLabelId = useId();
  const { health, ltv, liquidationLtv, liquidationPrice, interestPerYearUsd } =
    position;

  return (
    <Card
      aria-label={loanName(position)}
      className="min-w-0 flex-[1.2_1_480px]"
      role="region">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <div className={CAPTION}>ACTIVE LOAN</div>
        <MarketPill position={position} />
      </div>
      {position.status === 'at-risk' ? (
        <RiskBanner position={position} />
      ) : null}
      <dl className="m-0 mt-[16px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[12px]">
        <ReservesTile
          assets={position.collateral}
          chain={position.chainLabel}
          label="Collateral"
          usd={position.collateralUsd}
        />
        <ReservesTile
          assets={position.debt}
          chain={position.chainLabel}
          label="Debt"
          usd={position.debtUsd}
        />
      </dl>
      <div className="mt-[22px] flex items-baseline justify-between leading-[normal]">
        <div className="text-[14px] font-semibold text-mut" id={ltvLabelId}>
          Loan to value
        </div>
        <div
          aria-hidden="true"
          className="text-[28px] font-extrabold tracking-[-0.03em]">
          {ltv === null ? DASH : formatLtv(ltv)}
        </div>
      </div>
      <LtvBar
        className="mt-[22px]"
        labelledBy={ltvLabelId}
        liquidationLtvBps={
          liquidationLtv === null ? null : toBps(liquidationLtv)
        }
        ltv={ltv === null ? null : ltv * 100}
      />
      {/* "Borrow fee paid" (line 432) has no source and is left out (decided). */}
      <dl className="m-0 mt-[20px] grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[10px]">
        <StatTile
          label="Health"
          tone={healthTone(health)}
          value={health === null ? DASH : formatHealth(health)}
        />
        <StatTile
          label="Liquidation LTV"
          value={
            liquidationLtv === null ? DASH : formatBps(toBps(liquidationLtv))
          }
        />
        <StatTile
          label="Liq. price"
          value={
            liquidationPrice === null ? DASH : formatUsd(liquidationPrice.usd)
          }
        />
        <StatTile
          label="Borrow APR"
          value={formatOptionalApr(position.borrowApr)}
        />
        <StatTile
          label="Interest / year"
          value={
            interestPerYearUsd === null
              ? DASH
              : formatUsdCents(interestPerYearUsd)
          }
        />
      </dl>
    </Card>
  );
}

/**
 * A repaid loan (`posRepaid`, Web-Repaid.dc.html lines 488–502): the card at
 * max-width 560; the badge beside "Loan repaid" (26px / 800 / -0.02em) and
 * its 15px `mut` line; the collateral tile 18px under; the withdraw button
 * (`.go`) 18px under that. Withdrawing is its own feature, so the button is
 * drawn disabled until it ships, and its "Withdraw to another wallet" option
 * is left to that feature. A read-only loan has no button.
 */
function RepaidLoanCard({ position }: { position: LoanPosition }) {
  const titleId = useId();
  const { amount } = reservesLabel(position.collateral);

  return (
    <Card
      aria-labelledby={titleId}
      className="max-w-[560px] min-w-0 flex-[1_1_auto]"
      role="region">
      <div className="flex items-center gap-[14px] leading-[normal]">
        {/* Web-Repaid.dc.html line 490: the 44px badge. */}
        <DoneMark className="shrink-0" size={44} />
        <div>
          <h2
            className="m-0 text-[26px] font-extrabold tracking-[-0.02em]"
            id={titleId}>
            Loan repaid
          </h2>
          <p className="m-0 text-[15px] text-mut">
            {position.manageable
              ? 'Your collateral is free to withdraw.'
              : `Your collateral is free to withdraw on ${position.providerName}.`}
          </p>
        </div>
      </div>
      <dl className="m-0 mt-[18px]">
        <ReservesTile
          assets={position.collateral}
          chain={position.chainLabel}
          label="Collateral to withdraw"
          size="lg"
          usd={position.collateralUsd}
        />
      </dl>
      {position.manageable ? (
        <Button className="mt-[18px]" disabled>
          {position.collateral.length === 1
            ? `Withdraw ${amount}`
            : 'Withdraw collateral'}
        </Button>
      ) : null}
    </Card>
  );
}

type PositionCardProps = {
  position: LoanPosition;
};

/**
 * One loan on My positions: the active card, with the "Close to liquidation"
 * banner when it is at risk, or the repaid card. A loan Borrow cannot manage
 * (`manageable: false`) has the provider's name in the pill and no action
 * buttons.
 */
export function PositionCard({ position }: PositionCardProps) {
  return position.status === 'repaid' ? (
    <RepaidLoanCard position={position} />
  ) : (
    <ActiveLoanCard position={position} />
  );
}
