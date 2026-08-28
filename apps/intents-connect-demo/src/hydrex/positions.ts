import { base } from 'viem/chains';
import { createPublicClient, getAddress, http, parseAbi } from 'viem';

import { formatAddressTruncate } from '@aurora-is-near/intents-swap-widget/utils';

import { ALCHEMY_BASE_RPC, NPM } from './constants';
import { basePublic, POOL_ABI } from './plan';

/** Only for the mint-date lookup — see ALCHEMY_BASE_RPC. */
const baseArchive = createPublicClient({
  chain: base,
  transport: http(ALCHEMY_BASE_RPC, { batch: true }),
});

/** Above/below are relative to the live price, so they name the side the range sits on. */
export type RangeSide = 'in' | 'above' | 'below';

export type HydrexPositionToken = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  /** Atomic amount this side of the position currently holds. */
  amount: bigint;
};

export type HydrexPosition = {
  tokenId: bigint;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  token0: HydrexPositionToken;
  token1: HydrexPositionToken;
  side: RangeSide;
  /** When the NFT was minted. Absent if the archive lookup failed. */
  createdAt?: Date;
};

export type HydrexPositions = {
  positions: HydrexPosition[];
  /** How many the wallet owns in total — may exceed `positions.length`. */
  ownedCount: number;
  /** True when enumeration was capped and some positions are not shown. */
  isTruncated: boolean;
};

/** Enumerating an unbounded NFT balance would fan out without limit. */
const MAX_ENUMERATED = 100;

/** `decreaseLiquidity` rejects a past deadline; this call is only ever simulated. */
const NEVER_EXPIRES = 2n ** 32n - 1n;

const NPM_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function factory() view returns (address)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  // Algebra's variant carries an extra `deployer` between token1 and tickLower.
  'function positions(uint256 tokenId) view returns (uint88 nonce, address operator, address token0, address token1, address deployer, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  'function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) payable returns (uint256 amount0, uint256 amount1)',
]);

const ERC20_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

const FACTORY_ABI = parseAbi([
  'function poolByPair(address tokenA, address tokenB) view returns (address)',
  'function customPoolByPair(address deployer, address tokenA, address tokenB) view returns (address)',
]);

type Erc20Meta = { symbol: string; decimals: number };

type PoolKey = `${string}-${string}-${string}`;

const poolKey = (deployer: string, token0: string, token1: string): PoolKey =>
  `${deployer}-${token0}-${token1}`;

/** Pool addresses are immutable, so one lookup per pair outlives any single query. */
const poolCache = new Map<PoolKey, `0x${string}`>();

/**
 * Uniswap's own convention — lower inclusive, upper exclusive.
 *
 * Tempting shortcut, do not take it: the amounts look like they already answer
 * this (all token1 above the range, all token0 below). They don't. A position
 * holding dust rounds one side to zero while still straddling the price, and
 * gets labelled out-of-range when it isn't. The live tick is the only honest
 * source, so `pool` is worth the extra read.
 */
const rangeSide = (
  tick: number,
  tickLower: number,
  tickUpper: number,
): RangeSide => {
  if (tick < tickLower) {
    return 'below';
  }

  if (tick >= tickUpper) {
    return 'above';
  }

  return 'in';
};

/** Falls back to the amount split when the pool cannot be resolved. */
const inferredSide = (amount0: bigint, amount1: bigint): RangeSide => {
  if (amount0 === 0n && amount1 > 0n) {
    return 'above';
  }

  if (amount1 === 0n && amount0 > 0n) {
    return 'below';
  }

  return 'in';
};

const readErc20Meta = async (
  addresses: `0x${string}`[],
  blockNumber: bigint,
): Promise<Map<`0x${string}`, Erc20Meta>> => {
  // The only reads allowed to fail individually: a token predating the current
  // ERC20 metadata conventions returns bytes32 from `symbol()` and cannot be
  // decoded as a string. One bad token must not empty the whole list.
  const results = await basePublic.multicall({
    blockNumber,
    batchSize: 0,
    contracts: addresses.flatMap((address) => [
      { address, abi: ERC20_ABI, functionName: 'symbol' } as const,
      { address, abi: ERC20_ABI, functionName: 'decimals' } as const,
    ]),
  });

  return new Map(
    addresses.map((address, i) => {
      const symbol = results[i * 2];
      const decimals = results[i * 2 + 1];

      return [
        address,
        {
          symbol:
            symbol?.status === 'success'
              ? (symbol.result as string)
              : formatAddressTruncate(address, 8),
          decimals:
            decimals?.status === 'success' ? Number(decimals.result) : 18,
        },
      ];
    }),
  );
};

/**
 * Live tick per distinct pool, keyed by the pair the position names. Pairs the
 * factory does not know are simply absent — the caller falls back rather than
 * letting `globalState()` decode empty data off the zero address.
 */
const readPoolTicks = async (
  positions: {
    deployer: string;
    token0: `0x${string}`;
    token1: `0x${string}`;
  }[],
  blockNumber: bigint,
): Promise<Map<PoolKey, number>> => {
  const pairs = [
    ...new Map(
      positions.map((p) => [poolKey(p.deployer, p.token0, p.token1), p]),
    ),
  ];

  const unresolved = pairs.filter(([key]) => !poolCache.has(key));

  if (unresolved.length > 0) {
    const factory = await basePublic.readContract({
      address: getAddress(NPM),
      abi: NPM_ABI,
      functionName: 'factory',
      blockNumber,
    });

    // Algebra routes custom pools through a separate getter; the default
    // deployer is the zero address.
    const found = await basePublic.multicall({
      blockNumber,
      batchSize: 0,
      contracts: unresolved.map(([, p]) =>
        BigInt(p.deployer) === 0n
          ? ({
              address: factory,
              abi: FACTORY_ABI,
              functionName: 'poolByPair',
              args: [p.token0, p.token1],
            } as const)
          : ({
              address: factory,
              abi: FACTORY_ABI,
              functionName: 'customPoolByPair',
              args: [p.deployer as `0x${string}`, p.token0, p.token1],
            } as const),
      ),
    });

    unresolved.forEach(([key], i) => {
      const pool = found[i];

      if (pool?.status === 'success' && BigInt(pool.result) !== 0n) {
        poolCache.set(key, pool.result);
      }
    });
  }

  const known = pairs.flatMap(([key]) => {
    const pool = poolCache.get(key);

    return pool ? [[key, pool] as const] : [];
  });

  const states = await basePublic.multicall({
    blockNumber,
    batchSize: 0,
    contracts: known.map(([, pool]) => ({
      address: pool,
      abi: POOL_ABI,
      functionName: 'globalState' as const,
    })),
  });

  return new Map(
    known.flatMap(([key], i) => {
      const state = states[i];

      return state?.status === 'success'
        ? [[key, state.result[1]] as const]
        : [];
    }),
  );
};

const TRANSFER_EVENT = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
])[0];

/**
 * Mint date per token. A position carries no timestamp on-chain, so this reads
 * the `Transfer` that created it — one filtered log query for every token at
 * once, then the block timestamps behind them.
 *
 * Best-effort by design: a date is decoration, and losing the archive node must
 * not cost the caller the list itself.
 */
const readMintDates = async (
  npm: `0x${string}`,
  tokenIds: bigint[],
): Promise<Map<bigint, Date>> => {
  try {
    const logs = await baseArchive.getLogs({
      address: npm,
      event: TRANSFER_EVENT,
      // Minted, rather than merely transferred in: `from` is the zero address.
      args: { from: '0x'.padEnd(42, '0') as `0x${string}`, tokenId: tokenIds },
      fromBlock: 0n,
      toBlock: 'latest',
    });

    const blocks = await Promise.all(
      [...new Set(logs.map((log) => log.blockNumber))].map((blockNumber) =>
        baseArchive
          .getBlock({ blockNumber })
          .then((block) => [blockNumber, Number(block.timestamp)] as const),
      ),
    );

    const timestamps = new Map(blocks);

    return new Map(
      logs.flatMap((log) => {
        const seconds = timestamps.get(log.blockNumber);
        const { tokenId } = log.args;

        return seconds === undefined || tokenId === undefined
          ? []
          : [[tokenId, new Date(seconds * 1000)] as const];
      }),
    );
  } catch {
    return new Map();
  }
};

export const fetchHydrexPositions = async (
  owner: string,
): Promise<HydrexPositions> => {
  // viem validates address checksums strictly; normalise once at the boundary.
  const account = getAddress(owner);
  const npm = getAddress(NPM);

  // Every read below is pinned to one block. Without it a transfer landing
  // mid-read shifts the enumerable index and `tokenOfOwnerByIndex` starts
  // answering for a position the wallet no longer owns. One block back, because
  // the node behind a load balancer may not have the very latest yet.
  const head = await basePublic.getBlockNumber();
  const blockNumber = head > 0n ? head - 1n : head;

  const ownedCount = Number(
    await basePublic.readContract({
      address: npm,
      abi: NPM_ABI,
      functionName: 'balanceOf',
      args: [account],
      blockNumber,
    }),
  );

  if (ownedCount === 0) {
    return { positions: [], ownedCount: 0, isTruncated: false };
  }

  const enumerated = Math.min(ownedCount, MAX_ENUMERATED);

  // Token ids are not sequential — they must come from the enumeration.
  const tokenIds = await basePublic.multicall({
    blockNumber,
    batchSize: 0,
    allowFailure: false,
    contracts: Array.from({ length: enumerated }, (_, index) => ({
      address: npm,
      abi: NPM_ABI,
      functionName: 'tokenOfOwnerByIndex' as const,
      args: [account, BigInt(index)] as const,
    })),
  });

  const raw = await basePublic.multicall({
    blockNumber,
    batchSize: 0,
    allowFailure: false,
    contracts: tokenIds.map((tokenId) => ({
      address: npm,
      abi: NPM_ABI,
      functionName: 'positions' as const,
      args: [tokenId] as const,
    })),
  });

  // Closed positions dominate the contract — filtering here keeps the metadata
  // and simulation stages below proportional to what actually gets rendered.
  const open = raw.flatMap((position, i) => {
    const tokenId = tokenIds[i];
    const [, , token0, token1, deployer, tickLower, tickUpper, liquidity] =
      position;

    if (tokenId === undefined || liquidity === 0n) {
      return [];
    }

    return [
      { tokenId, token0, token1, deployer, tickLower, tickUpper, liquidity },
    ];
  });

  if (open.length === 0) {
    return { positions: [], ownedCount, isTruncated: ownedCount > enumerated };
  }

  const [meta, ticks, mintDates] = await Promise.all([
    readErc20Meta(
      [...new Set(open.flatMap(({ token0, token1 }) => [token0, token1]))],
      blockNumber,
    ),
    readPoolTicks(open, blockNumber),
    readMintDates(
      npm,
      open.map(({ tokenId }) => tokenId),
    ),
  ]);

  // Rather than reimplementing Uniswap V3 liquidity math, ask the contract what
  // the position is worth: simulating a full `decreaseLiquidity` returns the
  // exact amounts it would pay out. `account` matters because the call is
  // authorisation-gated, and nothing is broadcast — this is an eth_call.
  const amounts = await Promise.all(
    open.map(({ tokenId, liquidity }) =>
      basePublic
        .simulateContract({
          account,
          blockNumber,
          address: npm,
          abi: NPM_ABI,
          functionName: 'decreaseLiquidity',
          args: [
            {
              tokenId,
              liquidity,
              amount0Min: 0n,
              amount1Min: 0n,
              deadline: NEVER_EXPIRES,
            },
          ],
        })
        .then(({ result }) => result)
        .catch(() => undefined),
    ),
  );

  const positions = open.flatMap((position, i) => {
    const amount = amounts[i];

    if (!amount) {
      return [];
    }

    const [amount0, amount1] = amount;

    const side = (address: `0x${string}`, value: bigint) => ({
      address,
      amount: value,
      symbol: meta.get(address)?.symbol ?? formatAddressTruncate(address, 8),
      decimals: meta.get(address)?.decimals ?? 18,
    });

    const tick = ticks.get(
      poolKey(position.deployer, position.token0, position.token1),
    );

    return [
      {
        tokenId: position.tokenId,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        liquidity: position.liquidity,
        token0: side(position.token0, amount0),
        token1: side(position.token1, amount1),
        side:
          tick === undefined
            ? inferredSide(amount0, amount1)
            : rangeSide(tick, position.tickLower, position.tickUpper),
        createdAt: mintDates.get(position.tokenId),
      },
    ];
  });

  // Newest first. Token ids are handed out in mint order, so they order the
  // list on their own — which matters because a date is missing whenever the
  // archive lookup failed, and enumeration order is the contract's, not time's.
  positions.sort((a, b) => {
    const byDate =
      (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);

    return byDate || Number(b.tokenId - a.tokenId);
  });

  return { positions, ownedCount, isTruncated: ownedCount > enumerated };
};
