import { bestOf, type MarketRow } from '../marketRows';

/**
 * Which providers a loan fits, and which one it goes to (Web-Borrow.dc.html
 * lines 1142–1143): a provider fits when the loan's LTV is at most the max
 * LTV of its chosen chain; BEST is the lowest APR among the providers that
 * fit; the selection is the user's pick if it fits, else BEST.
 */

type MarketFitInput = {
  /** Each provider's chosen chain (`ProviderRow.chosen`), one per provider. */
  rows: readonly Pick<MarketRow, 'market' | 'apr' | 'maxLtvBps'>[];
  /** The slider's loan-to-value, in whole percent. */
  ltv: number;
  /** The provider the user picked (`LendingMarket.provider`), if any. */
  pickedId?: string;
};

type MarketFit = {
  /** Per provider: whether the LTV is within its max LTV. */
  fits: ReadonlyMap<string, boolean>;
  /** The lowest APR among the providers that fit; `undefined` when none fit. */
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
    rows.map(({ market, maxLtvBps }) => [
      market.provider,
      loanLtvBps <= maxLtvBps,
    ]),
  );

  const fitting = rows.filter(
    ({ market }) => fits.get(market.provider) === true,
  );

  const bestId = bestOf(fitting)?.market.provider;
  const pickFits = pickedId !== undefined && fits.get(pickedId) === true;

  return { fits, bestId, selectedId: pickFits ? pickedId : bestId };
};
