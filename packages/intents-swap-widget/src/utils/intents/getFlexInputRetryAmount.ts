const BPS = 10_000n;

/**
 * 1Click checks a FLEX_INPUT quote's `minAmountIn` (the amount less slippage)
 * against the origin bridge minimum, which the USD-based deposit floor does not
 * know about - e.g. 1 USDT on Tron, more when refunds go back to the origin
 * chain. The minimum comes back in the error ("Amount is too low for bridge,
 * try at least 1000000"), so this returns the amount whose `minAmountIn` clears
 * it, or `undefined` when the message carries no minimum.
 */
export const getFlexInputRetryAmount = (
  errorMessage: string,
  slippageBps: number,
): string | undefined => {
  if (!errorMessage.includes('Amount is too low')) {
    return undefined;
  }

  const minAmount = errorMessage.match(/\d+/)?.[0];

  if (!minAmount || !Number.isFinite(slippageBps)) {
    return undefined;
  }

  const slippage = BigInt(Math.ceil(slippageBps));

  if (slippage < 0n || slippage >= BPS) {
    return undefined;
  }

  // BigInt ceiling division: (a + b - 1) / b
  const keep = BPS - slippage;

  return ((BigInt(minAmount) * BPS + keep - 1n) / keep).toString();
};
