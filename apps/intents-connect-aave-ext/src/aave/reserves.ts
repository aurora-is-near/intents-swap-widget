import { type Address, createPublicClient, http, parseAbi } from 'viem';
import { arbitrum, base, mainnet, monad, polygon } from 'viem/chains';

import type { AaveMarket } from './markets';

/** A reserve of a market that takes supplies. */
export type AaveReserve = {
  asset: Address;
  symbol: string;
  decimals: number;
  /** A fraction, compounded per second; incentives excluded. */
  supplyApy: number;
  /** Listed but can't take a supply now. */
  unavailable?: string;
};

// IPoolDataProvider, aave-v3-origin.
const DATA_PROVIDER_ABI = parseAbi([
  'function getAllReservesTokens() view returns ((string symbol, address tokenAddress)[])',
  'function getReserveConfigurationData(address asset) view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)',
  'function getPaused(address asset) view returns (bool isPaused)',
  'function getReserveCaps(address asset) view returns (uint256 borrowCap, uint256 supplyCap)',
  'function getReserveData(address asset) view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)',
]);

const CHAINS = { eth: mainnet, base, arb: arbitrum, pol: polygon, monad };

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

/** Aave quotes a per-second-compounded APR in ray (1e27). */
const toApy = (liquidityRate: bigint) =>
  Math.expm1(
    SECONDS_PER_YEAR *
      Math.log1p(Number(liquidityRate) / 1e27 / SECONDS_PER_YEAR),
  );

/**
 * The market's reserves a supply can go into, in Aave's order: active,
 * neither paused nor frozen. One with its supply cap reached is listed as
 * unavailable. Two RPC calls: the list, then one multicall.
 */
export const fetchAaveReserves = async (
  market: AaveMarket,
  rpcUrl: string,
): Promise<AaveReserve[]> => {
  const client = createPublicClient({
    chain: CHAINS[market.chain],
    transport: http(rpcUrl),
  });

  const tokens = await client.readContract({
    address: market.dataProvider,
    abi: DATA_PROVIDER_ABI,
    functionName: 'getAllReservesTokens',
  });

  const reads = await client.multicall({
    allowFailure: false,
    contracts: tokens.flatMap(({ tokenAddress }) => [
      {
        address: market.dataProvider,
        abi: DATA_PROVIDER_ABI,
        functionName: 'getReserveConfigurationData' as const,
        args: [tokenAddress] as const,
      },
      {
        address: market.dataProvider,
        abi: DATA_PROVIDER_ABI,
        functionName: 'getPaused' as const,
        args: [tokenAddress] as const,
      },
      {
        address: market.dataProvider,
        abi: DATA_PROVIDER_ABI,
        functionName: 'getReserveCaps' as const,
        args: [tokenAddress] as const,
      },
      {
        address: market.dataProvider,
        abi: DATA_PROVIDER_ABI,
        functionName: 'getReserveData' as const,
        args: [tokenAddress] as const,
      },
    ]),
  });

  return tokens.flatMap(({ symbol, tokenAddress }, index): AaveReserve[] => {
    const [config, paused, caps, data] = reads.slice(index * 4) as [
      readonly [
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        boolean,
        boolean,
        boolean,
        boolean,
        boolean,
      ],
      boolean,
      readonly [bigint, bigint],
      readonly bigint[],
    ];

    const [decimals, , , , , , , , isActive, isFrozen] = config;

    if (!isActive || isFrozen || paused) {
      return [];
    }

    const [, supplyCap] = caps;
    const totalSupplied = data[2] ?? 0n;
    const capReached =
      supplyCap > 0n && totalSupplied >= supplyCap * 10n ** decimals;

    return [
      {
        asset: tokenAddress,
        symbol,
        decimals: Number(decimals),
        supplyApy: toApy(data[5] ?? 0n),
        ...(capReached && { unavailable: 'Supply cap reached' }),
      },
    ];
  });
};
