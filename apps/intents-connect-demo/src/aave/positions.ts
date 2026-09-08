import { getAddress, parseAbi } from 'viem';

import { DATA_PROVIDER } from './constants';
import { monadPublic } from './client';

export type AavePosition = {
  asset: `0x${string}`;
  symbol: string;
  decimals: number;
  supplied: bigint;
  borrowed: bigint;
  isCollateral: boolean;
  /** Fraction, not percent. Excludes incentives. */
  supplyApy: number;
};

// IPoolDataProvider retains the deprecated stable-debt fields in its ABI.
// https://github.com/aave-dao/aave-v3-origin/blob/main/src/contracts/interfaces/IPoolDataProvider.sol
export const DATA_PROVIDER_ABI = parseAbi([
  'function getAllReservesTokens() view returns ((string symbol, address tokenAddress)[])',
  'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)',
]);

const ERC20_ABI = parseAbi(['function decimals() view returns (uint8)']);
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

export const fetchAavePositions = async (
  owner: string,
): Promise<AavePosition[]> => {
  const account = getAddress(owner);
  const head = await monadPublic.getBlockNumber();
  // Pin every balance and metadata read to one block behind the RPC head.
  const blockNumber = head > 0n ? head - 1n : head;
  const reserves = await monadPublic.readContract({
    address: DATA_PROVIDER,
    abi: DATA_PROVIDER_ABI,
    functionName: 'getAllReservesTokens',
    blockNumber,
  });

  if (reserves.length === 0) {
    return [];
  }

  // Discover all current reserves, including assets supplied outside this demo.
  // Failed reads must surface as errors, never masquerade as zero balances.
  const balances = await monadPublic.multicall({
    blockNumber,
    allowFailure: false,
    contracts: reserves.map(
      ({ tokenAddress }) =>
        ({
          address: DATA_PROVIDER,
          abi: DATA_PROVIDER_ABI,
          functionName: 'getUserReserveData' as const,
          args: [tokenAddress, account] as const,
        }) as const,
    ),
  });

  const open = reserves.flatMap((reserve, i) => {
    const balance = balances[i];

    if (!balance) {
      throw new Error(`Missing Aave balance for ${reserve.symbol}`);
    }

    const [supplied, stableDebt, variableDebt, , , , rate, , isCollateral] =
      balance;

    const borrowed = stableDebt + variableDebt;

    return supplied > 0n || borrowed > 0n
      ? [{ ...reserve, supplied, borrowed, rate, isCollateral }]
      : [];
  });

  if (open.length === 0) {
    return [];
  }

  const decimals = await monadPublic.multicall({
    blockNumber,
    allowFailure: false,
    contracts: open.map(({ tokenAddress }) => ({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals' as const,
    })),
  });

  return open.map((position, i) => {
    const tokenDecimals = decimals[i];

    if (tokenDecimals === undefined) {
      throw new Error(`Missing Aave decimals for ${position.symbol}`);
    }

    return {
      asset: position.tokenAddress,
      symbol: position.symbol,
      decimals: tokenDecimals,
      supplied: position.supplied,
      borrowed: position.borrowed,
      isCollateral: position.isCollateral,
      // Aave quotes an APR in ray (1e27). Compound per second to show APY;
      // log1p/expm1 preserve small rates without converting any token balances.
      supplyApy: Math.expm1(
        SECONDS_PER_YEAR *
          Math.log1p(Number(position.rate) / 1e27 / SECONDS_PER_YEAR),
      ),
    };
  });
};
