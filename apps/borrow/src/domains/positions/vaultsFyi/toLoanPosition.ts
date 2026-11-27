import { formatUnits } from 'viem';

import { byUsdDescending, sumUsd } from '../model/reserves';
import { loanStatus } from '../model/status';
import { chainLabelOf, isBorrowMarket } from './networks';
import type { LoanPosition, PositionAsset } from '../types';
import type { VaultsFyiPosition, VaultsFyiPositionAsset } from './guards';

/** `<network>:<marketId>:<owner>`, built the same from either position read. */
const loanId = (network: string, marketId: string, owner: string) =>
  `${network}:${marketId.toLowerCase()}:${owner.toLowerCase()}`;

const toAsset = (
  { positionId, asset }: VaultsFyiPositionAsset,
  native: bigint,
  usd: number | null,
): PositionAsset => ({
  id: positionId,
  address: asset.address,
  symbol: asset.symbol,
  amount: Number(formatUnits(native, asset.decimals)),
  usd,
});

/**
 * A vaults.fyi market position as a loan, or `null` when it holds nothing.
 * Collateral is what is supplied with collateral enabled; debt is what is
 * borrowed. Each market keeps all its reserves; a balance vaults.fyi lists in
 * several markets is counted once in the totals, by its `positionId`.
 *
 * The liquidation LTV, borrow APR and the figures built on them are not in a
 * position read; they are `null` here and filled from the market
 * (`withMarketRisk`).
 */
export const toLoanPosition = (
  position: VaultsFyiPosition,
): LoanPosition | null => {
  const { assets } = position;

  const collateral = byUsdDescending(
    assets
      .filter(
        ({ collateralEnabled, suppliedNative }) =>
          collateralEnabled && suppliedNative > 0n,
      )
      .map((asset) => toAsset(asset, asset.suppliedNative, asset.suppliedUsd)),
  );

  const debt = byUsdDescending(
    assets
      .filter(({ borrowedNative }) => borrowedNative > 0n)
      .map((asset) => toAsset(asset, asset.borrowedNative, asset.borrowedUsd)),
  );

  if (collateral.length === 0 && debt.length === 0) {
    return null;
  }

  const collateralUsd = sumUsd(collateral);
  const debtUsd = sumUsd(debt);
  const health = debt.length > 0 ? position.healthFactor : null;
  const { protocol, network, marketId, userAddress } = position;
  // vaults.fyi names Aave's markets its own way ("Aave V3 BASE Market",
  // "Arbitrum Aave Market"); Borrow's own are "Aave V3" beside the chain,
  // as the market list and Web-Position.dc.html show them.
  const manageable = isBorrowMarket(position);

  return {
    id: loanId(network.name, marketId, userAddress),
    provider: protocol.protocolId,
    providerName: protocol.displayName ?? protocol.name,
    network: network.name,
    chainLabel: chainLabelOf(network.name),
    marketId,
    marketName: manageable
      ? `${protocol.displayName ?? protocol.name} ${protocol.version?.toUpperCase() ?? ''}`.trim()
      : position.name,
    owner: userAddress,
    manageable,
    collateral,
    debt,
    collateralUsd,
    debtUsd,
    ltv: debt.length > 0 ? position.ltv : 0,
    liquidationLtv: null,
    health,
    liquidationPrice: null,
    borrowApr: null,
    interestPerYearUsd: null,
    status: loanStatus({ debt, collateral, health }),
  };
};
