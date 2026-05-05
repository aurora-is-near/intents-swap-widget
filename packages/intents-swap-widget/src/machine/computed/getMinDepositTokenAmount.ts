import type { Context } from '../context';
import type { DeepReadonly } from '@/types/utils';

// limit minimum deposit amount to 1 USD to avoid FLEX_INPUT quote failure
const MIN_DEPOSIT_USD_AMOUNT = 1;

// BTC has a higher floor than the USD minimum: 0.00011 BTC = 11 * 10^(decimals - 5)
const MIN_DEPOSIT_BTC_NUMERATOR = 11n;
const MIN_DEPOSIT_BTC_DECIMALS_OFFSET = 5;

export const getMinDepositTokenAmount = (
  ctx: DeepReadonly<Context>,
): string => {
  if (!ctx.sourceToken) {
    return '0';
  }

  const { price, decimals, assetId } = ctx.sourceToken;

  if (assetId === 'nep141:btc.omft.near') {
    const v = (
      MIN_DEPOSIT_BTC_NUMERATOR *
      10n ** BigInt(decimals - MIN_DEPOSIT_BTC_DECIMALS_OFFSET)
    ).toString();

    return v;
  }

  // Scale price to a BigInt to avoid floating-point imprecision.
  const priceFactor = BigInt(10 ** ctx.sourceToken.decimals);
  const priceBig = BigInt(Math.round(price * Number(priceFactor)));

  const numerator =
    BigInt(MIN_DEPOSIT_USD_AMOUNT) *
    BigInt(10) ** BigInt(decimals) *
    priceFactor;

  // BigInt ceiling division: (a + b - 1) / b
  return ((numerator + priceBig - 1n) / priceBig).toString();
};
