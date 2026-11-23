import {
  type Address,
  type ContractFunctionParameters,
  parseAbi,
  type PublicClient,
} from 'viem';

import type { BorrowReserve, CollateralReserve } from '../types';
import type { AaveMarket } from './registry';

/**
 * Lifted from `apps/intents-connect-aave-ext/src/aave/reserves.ts` (copied,
 * not imported: apps don't import from each other). Kept: the ABI, the "list,
 * then one multicall with `allowFailure: false`" shape, the active / frozen /
 * paused filter and the supply cap check. Changed: it takes a client, pins
 * every read to one block (as `apps/intents-connect-demo/src/aave/positions.ts`
 * does), also reads debt, liquidity, debt ceiling and oracle prices, and
 * throws on a missing value instead of reading it as zero.
 */

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
const RAY = 1e27;

/** The reads per reserve in the multicall, in this order. */
const RESERVE_READS = [
  'getReserveConfigurationData',
  'getPaused',
  'getReserveCaps',
  'getReserveData',
  'getTotalDebt',
  'getVirtualUnderlyingBalance',
  'getDebtCeiling',
] as const;

/** The oracle reads at the head of the multicall. */
const ORACLE_READS = 2;

/** A collateral reserve before the 1Click intersection adds its asset id. */
export type AaveCollateralReserve = Omit<CollateralReserve, 'assetId'>;

/** A borrowable reserve before the 1Click intersection adds its asset id. */
export type AaveBorrowReserve = Omit<BorrowReserve, 'assetId'>;

export type AaveReserves = {
  /** The block every value was read at: one behind the RPC head. */
  blockNumber: bigint;
  /** The oracle's unit: a price of this is 1 in the base currency. */
  baseCurrencyUnit: bigint;
  collateral: AaveCollateralReserve[];
  borrowable: AaveBorrowReserve[];
};

export type ReadAaveReservesOptions = {
  /**
   * Read only these reserves (any address case). Addresses that are not a
   * reserve of the market are ignored. Every reserve when left out.
   */
  assets?: readonly Address[];
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

type Reserve = { symbol: string; tokenAddress: Address };

const reserveName = (reserve: Reserve) =>
  `${reserve.symbol} (${reserve.tokenAddress})`;

const missing = (market: AaveMarket, what: string) =>
  new Error(`Aave ${market.name}: missing ${what}`);

const bigintAt = (
  values: readonly unknown[],
  index: number,
  fail: () => Error,
): bigint => {
  const value = values[index];

  if (typeof value !== 'bigint') {
    throw fail();
  }

  return value;
};

const booleanAt = (
  values: readonly unknown[],
  index: number,
  fail: () => Error,
): boolean => {
  const value = values[index];

  if (typeof value !== 'boolean') {
    throw fail();
  }

  return value;
};

const tupleAt = (
  values: readonly unknown[],
  index: number,
  fail: () => Error,
): readonly unknown[] => {
  const value = values[index];

  if (!Array.isArray(value)) {
    throw fail();
  }

  return value;
};

/**
 * `min(virtual balance, borrow cap − total debt when a cap is set)`, never
 * below zero. The cap is in whole tokens, so it is scaled by the decimals.
 */
export const availableLiquidity = ({
  virtualBalance,
  borrowCap,
  totalDebt,
  decimals,
}: {
  virtualBalance: bigint;
  borrowCap: bigint;
  totalDebt: bigint;
  decimals: bigint;
}): bigint => {
  const capRoom =
    borrowCap > 0n ? borrowCap * 10n ** decimals - totalDebt : virtualBalance;

  const available = capRoom < virtualBalance ? capRoom : virtualBalance;

  return available > 0n ? available : 0n;
};

/**
 * The market's collateral and borrowable reserves, all read at one block
 * (head − 1): the head, the reserve list, then one multicall with every
 * reserve read and the oracle's prices (viem chunks it into a few `eth_call`s,
 * all at this block). Any failed read rejects;
 * a missing value throws, naming the reserve and the field.
 *
 * - Collateral: active, not frozen, not paused, usable as collateral, LTV
 *   above 0 and no debt ceiling (isolation mode is excluded). A reached supply
 *   cap marks it `unavailable`.
 * - Borrowable: active, not frozen, not paused, borrowing enabled. A reached
 *   borrow cap marks it `unavailable`.
 */
export const readAaveReserves = async (
  client: AaveReadClient,
  market: AaveMarket,
  { assets }: ReadAaveReservesOptions = {},
): Promise<AaveReserves> => {
  const head = await client.getBlockNumber();
  const blockNumber = head > 0n ? head - 1n : head;

  const listed = await client.readContract({
    address: market.dataProvider,
    abi: DATA_PROVIDER_ABI,
    functionName: 'getAllReservesTokens',
    blockNumber,
  });

  const wanted = assets && new Set(assets.map((asset) => asset.toLowerCase()));

  const reserves: Reserve[] = listed.flatMap((entry, index) => {
    // The decoder's types promise both fields; a short RPC reply still throws.
    const symbol: unknown = entry?.symbol;
    const tokenAddress: unknown = entry?.tokenAddress;

    if (typeof symbol !== 'string' || typeof tokenAddress !== 'string') {
      throw missing(market, `reserve token #${index}`);
    }

    return !wanted || wanted.has(tokenAddress.toLowerCase())
      ? [{ symbol, tokenAddress: entry.tokenAddress }]
      : [];
  });

  const contracts: ContractFunctionParameters[] = [
    {
      address: market.oracle,
      abi: ORACLE_ABI,
      functionName: 'BASE_CURRENCY_UNIT',
    },
    {
      address: market.oracle,
      abi: ORACLE_ABI,
      functionName: 'getAssetsPrices',
      args: [reserves.map(({ tokenAddress }) => tokenAddress)],
    },
    ...reserves.flatMap(({ tokenAddress }) =>
      RESERVE_READS.map((functionName) => ({
        address: market.dataProvider,
        abi: DATA_PROVIDER_ABI,
        functionName,
        args: [tokenAddress],
      })),
    ),
  ];

  const reads = await client.multicall({
    blockNumber,
    allowFailure: false,
    contracts,
  });

  const baseCurrencyUnit = bigintAt(reads, 0, () =>
    missing(market, 'oracle BASE_CURRENCY_UNIT'),
  );

  const prices = tupleAt(reads, 1, () =>
    missing(market, 'oracle getAssetsPrices'),
  );

  const collateral: AaveCollateralReserve[] = [];
  const borrowable: AaveBorrowReserve[] = [];

  reserves.forEach((reserve, index) => {
    const name = reserveName(reserve);
    const at = ORACLE_READS + index * RESERVE_READS.length;
    const fail = (field: string) => () =>
      missing(market, `${field} for reserve ${name}`);

    const config = tupleAt(reads, at, fail('getReserveConfigurationData'));
    const paused = booleanAt(reads, at + 1, fail('getPaused'));
    const caps = tupleAt(reads, at + 2, fail('getReserveCaps'));
    const data = tupleAt(reads, at + 3, fail('getReserveData'));
    const totalDebt = bigintAt(reads, at + 4, fail('getTotalDebt'));
    const virtualBalance = bigintAt(
      reads,
      at + 5,
      fail('getVirtualUnderlyingBalance'),
    );

    const debtCeiling = bigintAt(reads, at + 6, fail('getDebtCeiling'));
    const priceBase = bigintAt(prices, index, fail('oracle price'));

    const decimals = bigintAt(config, 0, fail('decimals'));
    const ltv = bigintAt(config, 1, fail('ltv'));
    const liquidationThreshold = bigintAt(
      config,
      2,
      fail('liquidationThreshold'),
    );

    const usageAsCollateralEnabled = booleanAt(
      config,
      5,
      fail('usageAsCollateralEnabled'),
    );

    const borrowingEnabled = booleanAt(config, 6, fail('borrowingEnabled'));
    const isActive = booleanAt(config, 8, fail('isActive'));
    const isFrozen = booleanAt(config, 9, fail('isFrozen'));

    const borrowCap = bigintAt(caps, 0, fail('borrowCap'));
    const supplyCap = bigintAt(caps, 1, fail('supplyCap'));

    const totalAToken = bigintAt(data, 2, fail('totalAToken'));
    const variableBorrowRate = bigintAt(data, 6, fail('variableBorrowRate'));

    if (!isActive || isFrozen || paused) {
      return;
    }

    const unit = 10n ** decimals;
    const asset = {
      asset: reserve.tokenAddress,
      symbol: reserve.symbol,
      decimals: Number(decimals),
      priceBase,
    };

    if (usageAsCollateralEnabled && ltv > 0n && debtCeiling === 0n) {
      const supplyCapReached =
        supplyCap > 0n && totalAToken >= supplyCap * unit;

      collateral.push({
        ...asset,
        maxLtvBps: Number(ltv),
        liquidationLtvBps: Number(liquidationThreshold),
        ...(supplyCapReached && { unavailable: true }),
      });
    }

    if (borrowingEnabled) {
      const borrowCapReached = borrowCap > 0n && totalDebt >= borrowCap * unit;

      borrowable.push({
        ...asset,
        variableBorrowApr: Number(variableBorrowRate) / RAY,
        availableLiquidity: availableLiquidity({
          virtualBalance,
          borrowCap,
          totalDebt,
          decimals,
        }),
        ...(borrowCapReached && { unavailable: true }),
      });
    }
  });

  return { blockNumber, baseCurrencyUnit, collateral, borrowable };
};
