import { parseAbi } from 'viem';

// IPoolDataProvider, aave-v3-origin (src/contracts/interfaces). The deprecated
// stable-debt fields stay in the ABI so the tuples decode.
export const DATA_PROVIDER_ABI = parseAbi([
  'function getAllReservesTokens() view returns ((string symbol, address tokenAddress)[])',
  'function getReserveConfigurationData(address asset) view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)',
  'function getPaused(address asset) view returns (bool isPaused)',
  'function getReserveCaps(address asset) view returns (uint256 borrowCap, uint256 supplyCap)',
  'function getReserveData(address asset) view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)',
  'function getTotalDebt(address asset) view returns (uint256)',
  'function getVirtualUnderlyingBalance(address asset) view returns (uint256)',
  'function getDebtCeiling(address asset) view returns (uint256)',
]);

// IAaveOracle and IPriceOracleGetter, aave-v3-origin.
export const ORACLE_ABI = parseAbi([
  'function BASE_CURRENCY_UNIT() view returns (uint256)',
  'function getAssetsPrices(address[] assets) view returns (uint256[])',
]);

/** Aave quotes rates in ray. */
export const RAY = 1e27;

/** The reads per reserve in the multicall, in this order. */
export const RESERVE_READS = [
  'getReserveConfigurationData',
  'getPaused',
  'getReserveCaps',
  'getReserveData',
  'getTotalDebt',
  'getVirtualUnderlyingBalance',
  'getDebtCeiling',
] as const;

/** The oracle reads at the head of the multicall. */
export const ORACLE_READS = 2;
