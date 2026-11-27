import { parseOriginAsset } from '@aurora-is-near/intents-connect';

import { isReserveAvailable } from '@/domains/markets/utils/availability';
import type {
  BorrowReserve,
  CollateralReserve,
  MarketSnapshot,
} from '@/domains/markets/types';

/*
 * The checks before a borrow is signed: gas on the origin chain for the
 * deposit, and liquidity in the market for the amount.
 */

export type BorrowPreCheckReason = 'noGas' | 'noLiquidity';

/**
 * A check before the borrow is signed refused it: the origin chain has no
 * gas left for the deposit (`noGas`), or the market can't lend the amount
 * (`noLiquidity`). Nothing was created or spent.
 */
export class BorrowPreCheckError extends Error {
  readonly reason: BorrowPreCheckReason;

  constructor(reason: BorrowPreCheckReason, message: string) {
    super(message);
    this.name = 'BorrowPreCheckError';
    this.reason = reason;
  }
}

/** The reserve with `asset`'s address, in any case; none for no `asset`. */
const byAsset = <Reserve extends { asset: string }>(
  reserves: readonly Reserve[],
  asset: string | undefined,
) =>
  asset === undefined
    ? undefined
    : reserves.find(
        (reserve) => reserve.asset.toLowerCase() === asset.toLowerCase(),
      );

/** The loan's reserves as `snapshot` lists them. */
export const reservesIn = (
  snapshot: MarketSnapshot,
  loan: {
    collateral?: Pick<CollateralReserve, 'asset'>;
    borrow?: Pick<BorrowReserve, 'asset'>;
  },
): { collateral?: CollateralReserve; borrow?: BorrowReserve } => ({
  collateral: byAsset(snapshot.collateral, loan.collateral?.asset),
  borrow: byAsset(snapshot.borrowable, loan.borrow?.asset),
});

export type LiquidityCheck = 'ok' | 'noLiquidity';

/**
 * Before confirming: whether a freshly read snapshot can still lend
 * `borrowAmount` of `borrow`. A reserve that is gone, or not borrowable now,
 * counts as out of liquidity too.
 */
export const checkLiquidity = (
  snapshot: MarketSnapshot,
  borrow: Pick<BorrowReserve, 'asset'>,
  borrowAmount: bigint,
): LiquidityCheck => {
  const reserve = reservesIn(snapshot, { borrow }).borrow;

  return reserve &&
    isReserveAvailable(reserve) &&
    reserve.availableLiquidity >= borrowAmount
    ? 'ok'
    : 'noLiquidity';
};

/** What the gas pre-check reads: the funding rows and what is paid. */
export type GasPreCheckInput = {
  /**
   * The wallet's non-zero balances (`useFundingAssets().rows`), or
   * `undefined` while they are not read: the check is then skipped.
   */
  rows: readonly { assetId: string; amount: bigint }[] | undefined;
  /** The token paid with. */
  origin: { assetId: string; chain: string; contractAddress?: string };
  /** What is paid, in the origin token's atomic units. */
  amount: bigint;
};

/** The origin chain's gas token, as 1Click names it (`nep141:base.omft.near`). */
const isNativeOn = (assetId: string, chain: string) => {
  const parsed = parseOriginAsset(assetId);

  return parsed?.chain === chain && parsed.tokenAddress === undefined;
};

/**
 * Whether the wallet has gas left on the origin chain for the deposit
 * transaction, from the funding rows: some of the chain's gas token beyond
 * what is paid with it. `unknown` when the rows are not read, or the gas
 * token can't be told apart on that chain.
 *
 * The rows hold non-zero balances only, so a missing gas token is a zero
 * balance, assumed only when the paid token is itself a bridged
 * (`*.omft.near`) asset on that chain: the chain's gas token is then named
 * the same way and would be listed if held.
 */
export const checkOriginGas = ({
  rows,
  origin,
  amount,
}: GasPreCheckInput): 'ok' | 'short' | 'unknown' => {
  if (!rows) {
    return 'unknown';
  }

  const native = rows.find(({ assetId }) => isNativeOn(assetId, origin.chain));
  const payingNative = isNativeOn(origin.assetId, origin.chain);

  if (!native && !payingNative) {
    return parseOriginAsset(origin.assetId)?.chain === origin.chain
      ? 'short'
      : 'unknown';
  }

  const balance = native?.amount ?? 0n;
  const spent = payingNative ? amount : 0n;

  return balance > spent ? 'ok' : 'short';
};
