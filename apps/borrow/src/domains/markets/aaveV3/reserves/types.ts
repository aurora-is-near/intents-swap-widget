import type { Address, ContractFunctionParameters, PublicClient } from 'viem';

import type { BorrowReserve, CollateralReserve } from '../../types';

/** A collateral reserve before the 1Click intersection adds its asset id. */
export type AaveCollateralReserve = Omit<CollateralReserve, 'assetId'>;

/** A borrowable reserve before the 1Click intersection adds its asset id. */
export type AaveBorrowReserve = Omit<BorrowReserve, 'assetId'>;

export type AaveReserves = {
  /** The oracle's unit: a price of this is 1 in the base currency. */
  baseCurrencyUnit: bigint;
  collateral: AaveCollateralReserve[];
  borrowable: AaveBorrowReserve[];
};

export type ReadAaveReservesOptions = {
  /**
   * Read only these reserves (any address case). Addresses that are not a
   * reserve of the market are ignored. Every reserve when left out. A
   * promise is awaited alongside the head and the reserve list, which it
   * only filters.
   */
  assets?: readonly Address[] | Promise<readonly Address[]>;
};

/**
 * The client calls the read needs; a viem `PublicClient` (such as
 * `getClient(chainId)`) is one. The multicall is typed by what this file
 * sends, since its contracts are built at run time.
 */
export type AaveReadClient = Pick<
  PublicClient,
  'getBlockNumber' | 'readContract'
> & {
  multicall(parameters: {
    blockNumber: bigint;
    allowFailure: false;
    contracts: readonly ContractFunctionParameters[];
  }): Promise<readonly unknown[]>;
};

/** One entry of the market's reserve list. */
export type Reserve = { symbol: string; tokenAddress: Address };
