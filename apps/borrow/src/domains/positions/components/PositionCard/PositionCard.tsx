import { Banner, Button, Card, cn } from '@aurora-is-near/ui-kit';
import { useId } from 'react';

import { DoneMark } from '@/domains/borrow/components/DoneMark/DoneMark';

import { pricedTotal } from '../../model/reserves';
import {
  formatHealth,
  formatLiquidationLtv,
  formatLiquidationPrice,
  formatLtv,
  formatOptionalApr,
  formatUsdCents,
  healthTone,
  pairLabel,
  pillLabel,
  reservesLabel,
  riskText,
} from '../../utils/positionFormat';
import { LtvMeter } from '../LtvMeter/LtvMeter';
import type { LoanPosition, PositionAsset } from '../../types';

/*
 * Web-Positions-Multi.dc.html lines 401–434 (`posActive`) and
 * Web-Repaid.dc.html lines 487–503 (`posRepaid`). The Mob-* artboards share
 * the markup: below 640px only the card's padding changes (16px, from
 * `Card`), and the tile grids reflow by their `auto-fit` columns.
 */

/** The loan's name for assistive technology: "WETH → USDC, Aave V3 Base on Base". */
const loanName = (position: LoanPosition) => {
  const pair = pairLabel(position);
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
  const total = pricedTotal(assets, usd);

  return (
    <div className="min-w-0 rounded-18 bg-sf2 px-4.5 py-4 leading-font">
      <dt className="text-13 text-mut2">{label}</dt>
      <dd className="m-0">
        <span
          className={cn(
            'block font-extrabold tracking-figure break-words',
            size === 'lg' ? 'text-32' : 'text-30 leading-1.15',
          )}>
          {amount}
          {more ? (
            <span className="ml-2 text-13 font-semibold tracking-normal text-mut2">
              {more}
            </span>
          ) : null}
        </span>
        <span className="block text-13 text-mut2">
          {/* No total when a reserve has no price: the sum would leave it out. */}
          {total === null ? '—' : `≈ ${formatUsdCents(total)}`} · {chain}
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
    <div className="min-w-0 rounded-14 bg-sf2 px-4 py-3 leading-font">
      <dt className="text-12 text-mut2">{label}</dt>
      <dd
        className={cn(
          'm-0 text-26 font-extrabold tracking-title break-words',
          tone,
        )}>
        {value}
      </dd>
    </div>
  );
}

/**
 * The `market · APR` pill (line 406): `tint`, 1.5px `limebd` border, radius
 * 999, padding 5px 12px, 13px / 700, with the 7px live dot.
 */
function MarketPill({ position }: { position: LoanPosition }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-1.5 border-solid border-limebd bg-tint px-3 py-1.25 text-13 leading-font font-bold">
      <span
        aria-hidden="true"
        className="inline-block size-1.75 rounded-full bg-live"
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
    <Banner className="mt-4" title="Close to liquidation" tinted tone="danger">
      {riskText(position)}
      {position.manageable ? (
        <div className="mt-3 flex flex-wrap gap-2">
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
  const { health, ltv, liquidationLtv } = position;

  return (
    <Card
      aria-label={loanName(position)}
      className="min-w-0 flex-[1.2_1_480px]"
      role="region">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-sans text-12 tracking-label text-mut2">
          ACTIVE LOAN
        </div>
        <MarketPill position={position} />
      </div>
      {position.status === 'at-risk' ? (
        <RiskBanner position={position} />
      ) : null}
      <dl className="m-0 mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
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
      <div className="mt-5.5 flex items-baseline justify-between leading-font">
        <div className="text-14 font-semibold text-mut" id={ltvLabelId}>
          Loan to value
        </div>
        <div
          aria-hidden="true"
          className="text-28 font-extrabold tracking-figure">
          {formatLtv(ltv)}
        </div>
      </div>
      <LtvMeter
        className="mt-5.5"
        labelledBy={ltvLabelId}
        liquidationLtv={liquidationLtv}
        ltv={ltv}
      />
      {/* "Borrow fee paid" (line 432) has no source and is left out (decided). */}
      <dl className="m-0 mt-5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
        <StatTile
          label="Health"
          tone={healthTone(health)}
          value={formatHealth(health)}
        />
        <StatTile
          label="Liquidation LTV"
          value={formatLiquidationLtv(liquidationLtv)}
        />
        <StatTile
          label="Liq. price"
          value={formatLiquidationPrice(position.liquidationPrice)}
        />
        <StatTile
          label="Borrow APR"
          value={formatOptionalApr(position.borrowApr)}
        />
        <StatTile
          label="Interest / year"
          value={formatUsdCents(position.interestPerYearUsd)}
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
      className="max-w-140 min-w-0 flex-[1_1_auto]"
      role="region">
      <div className="flex items-center gap-3.5 leading-font">
        {/* Web-Repaid.dc.html line 490: the 44px badge. */}
        <DoneMark className="shrink-0" size={44} />
        <div>
          <h2
            className="m-0 text-26 font-extrabold tracking-title"
            id={titleId}>
            Loan repaid
          </h2>
          <p className="m-0 text-15 text-mut">
            {position.manageable
              ? 'Your collateral is free to withdraw.'
              : `Your collateral is free to withdraw on ${position.providerName}.`}
          </p>
        </div>
      </div>
      <dl className="m-0 mt-4.5">
        <ReservesTile
          assets={position.collateral}
          chain={position.chainLabel}
          label="Collateral to withdraw"
          size="lg"
          usd={position.collateralUsd}
        />
      </dl>
      {position.manageable ? (
        <Button className="mt-4.5" disabled>
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
