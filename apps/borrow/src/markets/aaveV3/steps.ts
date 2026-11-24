import type { Step } from '@aurora-is-near/intents-connect';

import type { BuildBorrowStepsInput } from '../types';
import type { AaveMarket } from './registry';

/**
 * Aave V3's borrow, as the intermediary runs it once the collateral has
 * arrived. Modelled on the supply steps of
 * `apps/intents-connect-aave-ext/src/aave/recipe.ts` (copied, not imported:
 * apps don't import from each other).
 */

/** Aave's referral code: none. */
const NO_REFERRAL = '0';

/** Aave's variable interest rate mode (stable is gone from V3.2). */
const VARIABLE_RATE_MODE = '2';

/** Approve the Pool, then supply `asset` for `owner`. */
const erc20Supply = (
  aave: AaveMarket,
  asset: string,
  amount: string,
  owner: string,
): Step[] => [
  {
    to: asset,
    functionSignature: 'approve(address,uint256)',
    parameters: [aave.pool, amount],
    value: '0',
  },
  {
    to: aave.pool,
    functionSignature: 'supply(address,uint256,address,uint16)',
    parameters: [asset, amount, owner, NO_REFERRAL],
    value: '0',
  },
];

/**
 * The native token, through the WrappedTokenGatewayV3: it wraps what it is
 * sent and supplies it for `owner`. Its first argument is ignored by current
 * gateways (the Pool is immutable there) but still part of the signature.
 */
const nativeSupply = (
  aave: AaveMarket,
  amount: string,
  owner: string,
): Step[] => {
  if (!aave.native) {
    throw new Error(`Aave V3 ${aave.label}: no native gateway`);
  }

  return [
    {
      to: aave.native.gateway,
      functionSignature: 'depositETH(address,address,uint16)',
      parameters: [aave.pool, owner, NO_REFERRAL],
      value: amount,
    },
  ];
};

/**
 * Supply the collateral for `owner`, borrow `borrowAmount` at the variable
 * rate on `owner`'s account, and send it to `recipient`. The intermediary
 * runs every step, so `owner` must be the intermediary for the borrow to be
 * allowed (Aave borrows on behalf of another account only with a credit
 * delegation). `amount` is opaque (it may be `{MIN_AMOUNT_OUT}`): templated,
 * never inspected. The service's fee is not a step.
 */
export const buildAaveBorrowSteps = (
  aave: AaveMarket,
  {
    collateral,
    borrow,
    amount,
    borrowAmount,
    owner,
    recipient,
  }: Omit<BuildBorrowStepsInput, 'market'>,
): Step[] => [
  ...(collateral.nativeDelivery === true
    ? nativeSupply(aave, amount, owner)
    : erc20Supply(aave, collateral.asset, amount, owner)),
  {
    to: aave.pool,
    functionSignature: 'borrow(address,uint256,uint256,uint16,address)',
    parameters: [
      borrow.asset,
      borrowAmount,
      VARIABLE_RATE_MODE,
      NO_REFERRAL,
      owner,
    ],
    value: '0',
  },
  {
    to: borrow.asset,
    functionSignature: 'transfer(address,uint256)',
    parameters: [recipient, borrowAmount],
    value: '0',
  },
];
