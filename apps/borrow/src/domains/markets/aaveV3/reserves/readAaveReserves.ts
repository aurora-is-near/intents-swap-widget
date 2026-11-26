import type { ContractFunctionParameters } from 'viem';

import { bigintAt } from '@/utils/bigintAt';
import { booleanAt } from '@/utils/booleanAt';
import { tupleAt } from '@/utils/tupleAt';

import { markUnavailable } from '../../utils/availability';
import {
  DATA_PROVIDER_ABI,
  ORACLE_ABI,
  ORACLE_READS,
  RAY,
  RESERVE_READS,
} from './constants';
import { availableLiquidity } from './utils/availableLiquidity';
import { missing } from './utils/missing';
import { reserveName } from './utils/reserveName';
import type { AaveMarket } from '../config/registry';
import type {
  AaveBorrowReserve,
  AaveCollateralReserve,
  AaveReadClient,
  AaveReserves,
  ReadAaveReservesOptions,
  Reserve,
} from './types';

/**
 * Lifted from `apps/intents-connect-aave-ext/src/aave/reserves.ts` (copied,
 * not imported: apps don't import from each other). Kept: the ABI, the "list,
 * then one multicall with `allowFailure: false`" shape, the active / frozen /
 * paused filter and the supply cap check. Changed: it takes a client, pins
 * every read to one block (as `apps/intents-connect-demo/src/aave/positions.ts`
 * does), also reads debt, liquidity, debt ceiling and oracle prices, and
 * throws on a missing value instead of reading it as zero.
 */

/** The error thrown for a missing `field` of one reserve. */
type FailFor = (field: string) => () => Error;

/** What every reserve shares as a collateral or a borrow. */
type ReserveAsset = Pick<
  AaveCollateralReserve,
  'asset' | 'symbol' | 'decimals' | 'priceBase'
>;

/**
 * One reserve's values, from its `RESERVE_READS` in the multicall (after the
 * `ORACLE_READS`) and its oracle price. Each is read in this order, so the
 * first missing one is the one named.
 */
const readReserveFields = (
  reads: readonly unknown[],
  prices: readonly unknown[],
  index: number,
  fail: FailFor,
) => {
  const at = ORACLE_READS + index * RESERVE_READS.length;

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

  return {
    paused,
    totalDebt,
    virtualBalance,
    debtCeiling,
    priceBase,
    decimals: bigintAt(config, 0, fail('decimals')),
    ltv: bigintAt(config, 1, fail('ltv')),
    liquidationThreshold: bigintAt(config, 2, fail('liquidationThreshold')),
    usageAsCollateralEnabled: booleanAt(
      config,
      5,
      fail('usageAsCollateralEnabled'),
    ),
    borrowingEnabled: booleanAt(config, 6, fail('borrowingEnabled')),
    isActive: booleanAt(config, 8, fail('isActive')),
    isFrozen: booleanAt(config, 9, fail('isFrozen')),
    borrowCap: bigintAt(caps, 0, fail('borrowCap')),
    supplyCap: bigintAt(caps, 1, fail('supplyCap')),
    totalAToken: bigintAt(data, 2, fail('totalAToken')),
    variableBorrowRate: bigintAt(data, 6, fail('variableBorrowRate')),
  };
};

type ReserveFields = ReturnType<typeof readReserveFields>;

/**
 * The reserve as collateral: usable as collateral, LTV above 0 and no debt
 * ceiling (isolation mode is excluded); `undefined` otherwise. `unit` is one
 * whole token, atomic.
 */
const collateralOf = (
  fields: ReserveFields,
  asset: ReserveAsset,
  unit: bigint,
): AaveCollateralReserve | undefined => {
  const { ltv, debtCeiling, supplyCap, totalAToken } = fields;

  if (!fields.usageAsCollateralEnabled || ltv <= 0n || debtCeiling !== 0n) {
    return undefined;
  }

  const reserve: AaveCollateralReserve = {
    ...asset,
    maxLtvBps: Number(ltv),
    liquidationLtvBps: Number(fields.liquidationThreshold),
  };

  return supplyCap > 0n && totalAToken >= supplyCap * unit
    ? markUnavailable(reserve, 'cap-reached')
    : reserve;
};

/**
 * The reserve as a borrow, when borrowing is enabled; `undefined` otherwise.
 * `unit` is one whole token, atomic.
 */
const borrowableOf = (
  fields: ReserveFields,
  asset: ReserveAsset,
  unit: bigint,
): AaveBorrowReserve | undefined => {
  const { borrowCap, totalDebt, decimals, virtualBalance } = fields;

  if (!fields.borrowingEnabled) {
    return undefined;
  }

  const reserve: AaveBorrowReserve = {
    ...asset,
    variableBorrowApr: Number(fields.variableBorrowRate) / RAY,
    availableLiquidity: availableLiquidity({
      virtualBalance,
      borrowCap,
      totalDebt,
      decimals,
    }),
  };

  return borrowCap > 0n && totalDebt >= borrowCap * unit
    ? markUnavailable(reserve, 'cap-reached')
    : reserve;
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
 *   cap marks it `unavailable` (`cap-reached`).
 * - Borrowable: active, not frozen, not paused, borrowing enabled. A reached
 *   borrow cap marks it `unavailable` (`cap-reached`).
 *
 * Whether the borrow action covers a reserve (`coming-soon`) is marked later,
 * by `markCoverage`, once the 1Click intersection knows which reserve is
 * delivered as the native token.
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
    const fail: FailFor = (field) => () =>
      missing(market, `${field} for reserve ${name}`);

    const fields = readReserveFields(reads, prices, index, fail);

    if (!fields.isActive || fields.isFrozen || fields.paused) {
      return;
    }

    // Aave's oracle reverts rather than pricing a listed asset at 0, so a zero
    // is a broken read: it must not reach the screen as "$0".
    if (fields.priceBase <= 0n) {
      throw fail('oracle price')();
    }

    const unit = 10n ** fields.decimals;
    const asset = {
      asset: reserve.tokenAddress,
      symbol: reserve.symbol,
      decimals: Number(fields.decimals),
      priceBase: fields.priceBase,
    };

    const asCollateral = collateralOf(fields, asset, unit);
    const asBorrow = borrowableOf(fields, asset, unit);

    if (asCollateral) {
      collateral.push(asCollateral);
    }

    if (asBorrow) {
      borrowable.push(asBorrow);
    }
  });

  return { baseCurrencyUnit, collateral, borrowable };
};
