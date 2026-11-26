import type { Address } from 'viem';

import type { BorrowReserve, LendingMarket } from '@/domains/markets/types';
import type { FundingAsset, FundingAssets } from '@/domains/wallet/types';
import type { BorrowFlowInput } from '@/domains/borrow/hooks/useBorrowFlow';

import type { CollateralChoice } from './collateral';
import type { CtaState } from './ctaState';
import type { LoanFigures } from './loanFigures';

/**
 * A ready loan, as the borrow flow takes it (`useBorrowFlow().start`), less
 * the market's adapter, with the wallet balance it is paid from.
 */
export type BorrowRequest = Omit<BorrowFlowInput, 'adapter'> & {
  paid: FundingAsset;
};

/**
 * The loan to borrow while the call to action is ready: a held balance, the
 * selected market (whose snapshot the figures were read in) and its
 * reserves; `undefined` otherwise.
 */
export const toBorrowRequest = ({
  cta,
  held,
  market,
  choice,
  borrowReserve,
  figures,
  atomic,
  ltv,
  recipient,
  fundingAssets,
}: {
  cta: CtaState;
  held: FundingAsset | undefined;
  market: LendingMarket | undefined;
  choice: CollateralChoice | undefined;
  borrowReserve: BorrowReserve | undefined;
  figures: LoanFigures | undefined;
  atomic: bigint;
  ltv: number;
  recipient: Address | undefined;
  fundingAssets: Pick<FundingAssets, 'status' | 'rows'>;
}): BorrowRequest | undefined => {
  if (
    cta.kind !== 'ready' ||
    !held ||
    !market ||
    !choice ||
    !borrowReserve ||
    !figures
  ) {
    return undefined;
  }

  return {
    market,
    collateral: choice.reserve,
    borrow: borrowReserve,
    origin: {
      assetId: held.assetId,
      chain: held.chain,
      decimals: held.decimals,
      contractAddress: held.contractAddress,
    },
    amount: atomic,
    ltv,
    estimatedBorrowAmount: figures.borrowAmount,
    recipient,
    fundingRows:
      fundingAssets.status === 'ready' ? fundingAssets.rows : undefined,
    paid: held,
  };
};
