/*
 * The Aave reserve read: only what the rest of `aaveV3/` (and its tests)
 * uses. Constants and helpers stay inside this folder.
 */
export { readAaveReserves } from './readAaveReserves';
export type {
  AaveBorrowReserve,
  AaveCollateralReserve,
  AaveReadClient,
  AaveReserves,
} from './types';
