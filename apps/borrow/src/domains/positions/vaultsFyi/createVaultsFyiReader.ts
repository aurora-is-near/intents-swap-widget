import { getVaultsFyi } from './client';
import { toMarket, toPosition, toPositionList } from './guards';
import { BORROW_MARKETS } from './networks';
import { toLoanPosition } from './toLoanPosition';
import type { LoanPosition, PositionsReader } from '../types';

const segment = (value: string) => encodeURIComponent(value);

/**
 * Positions from the vaults.fyi borrow API, through the key proxy.
 *
 * - `readOwnerPositions`: the wallet-wide list, which vaults.fyi limits to
 *   markets with debt.
 * - `readMarketPosition`: one market, with or without debt (repaid loans).
 * - `readMarketRisk`: liquidation thresholds and borrow rates, which a
 *   position read does not carry.
 */
export const createVaultsFyiReader = (): PositionsReader => ({
  readOwnerPositions: async (owner) =>
    toPositionList(
      await getVaultsFyi(`/portfolio/positions/${segment(owner)}`),
    ).flatMap((position): LoanPosition[] => {
      const loan = toLoanPosition(position);

      return loan ? [loan] : [];
    }),

  readMarketPosition: async (owner, { network, marketId }) =>
    toLoanPosition(
      toPosition(
        await getVaultsFyi(
          `/portfolio/positions/${segment(owner)}/${segment(network)}/${segment(marketId)}`,
        ),
      ),
    ),

  readMarketRisk: async ({ network, marketId }) => {
    const market = toMarket(
      await getVaultsFyi(`/markets/${segment(network)}/${segment(marketId)}`),
    );

    return {
      assets: Object.fromEntries(
        market.assetsData.map(({ asset, liquidationThreshold, borrowRate }) => [
          asset.address,
          { liquidationThreshold, borrowApr: borrowRate },
        ]),
      ),
    };
  },

  repaidMarkets: () => BORROW_MARKETS,
});
