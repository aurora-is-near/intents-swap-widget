import { bestOf, type MarketRow } from '../marketRows';

/**
 * Which markets a loan fits, and which one it goes to (Web-Borrow.dc.html
 * lines 1142–1143): a market fits when the loan's LTV is at most its max LTV;
 * BEST is the lowest APR among the markets that fit; the selection is the
 * user's pick if it fits, else BEST.
 */

type MarketFitInput = {
  rows: readonly Pick<MarketRow, 'market' | 'apr' | 'maxLtvBps'>[];
  /** The slider's loan-to-value, in whole percent. */
  ltv: number;
  /** The market id the user picked, if any. */
  pickedId?: string;
};

type MarketFit = {
  /** Per market id: whether the LTV is within its max LTV. */
  fits: ReadonlyMap<string, boolean>;
  /** The lowest APR among the markets that fit; `undefined` when none fit. */
  bestId: string | undefined;
  /** The pick if it fits, else BEST; `undefined` when none fit. */
  selectedId: string | undefined;
};

export const marketFit = ({
  rows,
  ltv,
  pickedId,
}: MarketFitInput): MarketFit => {
  // Compared in bps, so a max LTV such as 82.5% is exact.
  const loanLtvBps = ltv * 100;
  const fits = new Map(
    rows.map(({ market, maxLtvBps }) => [market.id, loanLtvBps <= maxLtvBps]),
  );

  const fitting = rows.filter(({ market }) => fits.get(market.id) === true);
  const bestId = bestOf(fitting)?.market.id;
  const pickFits = pickedId !== undefined && fits.get(pickedId) === true;

  return { fits, bestId, selectedId: pickFits ? pickedId : bestId };
};
