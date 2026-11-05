import {
  type ExecutionPlan,
  type Recipe,
  type Step,
  toQuoteAssetId,
} from '@aurora-is-near/intents-connect';

import type { SupplyInput } from '../ui/supply/types';
import { type AaveMarket, marketTitle } from './markets';

/** Basis points the bridge may slip by. */
const SLIPPAGE_BPS = 100;

/** Approve the Pool, then supply for `owner`. */
const erc20Supply = (
  market: AaveMarket,
  token: string,
  amount: string,
  owner: string,
): Step[] => [
  {
    to: token,
    functionSignature: 'approve(address,uint256)',
    parameters: [market.pool, amount],
    value: '0',
  },
  {
    to: market.pool,
    functionSignature: 'supply(address,uint256,address,uint16)',
    parameters: [token, amount, owner, '0'],
    value: '0',
  },
];

/**
 * The native token, through the gateway: it wraps what it is sent and
 * supplies it for `owner`. Its first argument is ignored by current gateways
 * (the Pool is immutable there) but still part of the signature.
 */
const nativeSupply = (
  market: AaveMarket,
  amount: string,
  owner: string,
): Step[] => {
  if (!market.native) {
    throw new Error(`Aave ${market.label} has no native gateway`);
  }

  return [
    {
      to: market.native.gateway,
      functionSignature: 'depositETH(address,address,uint16)',
      parameters: [market.pool, owner, '0'],
      value: amount,
    },
  ];
};

/**
 * A plan that bridges the user's token into `option`'s token on the market's
 * chain, where the intermediary approves the Pool and supplies it for
 * `owner` — the account connected on app.aave.com, so the position shows up
 * in its "Your supplies".
 */
export const buildAaveSupplyPlan =
  (market: AaveMarket, owner: string) =>
  ({
    option,
    destinationAsset,
    origin,
    amount,
  }: SupplyInput): ExecutionPlan => {
    const recipe: Recipe = {
      id: `aave-supply:${market.name}:${option.symbol}`,
      intent: 'aave_supply',
      title: `Supply ${option.symbol} to Aave ${marketTitle(market)}`,
      flow: 'bridge-in',
      type: 'evm',
      destination: {
        chain: market.chain,
        assetId: destinationAsset,
        tokenAddress: option.tokenAddress,
      },
      // `amount` is opaque (it may be the {MIN_AMOUNT_OUT} placeholder):
      // template it, never inspect it.
      buildSteps: ({ amount: spend }) =>
        option.tokenAddress
          ? erc20Supply(market, option.tokenAddress, spend, owner)
          : nativeSupply(market, spend, owner),
    };

    return {
      recipe,
      params: undefined,
      // No deadline: the quote preview stamps a fresh one on every refresh.
      quote: {
        // Native NEAR is quoted as wNEAR; its deposit wraps it.
        originAsset: toQuoteAssetId(origin),
        destinationAsset,
        amount,
        swapType: 'EXACT_INPUT',
        slippageTolerance: SLIPPAGE_BPS,
      },
      originChain: origin.blockchain,
      originToken: {
        contractAddress: origin.contractAddress,
        decimals: origin.decimals,
      },
      // The wallet holding the token sends the deposit.
      depositViaWallet: true,
    };
  };
