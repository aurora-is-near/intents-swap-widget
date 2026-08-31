import { failGuard } from '@/errors';

/**
 * Three-round flow only: the quote can move between the measuring round and the
 * create. If the service now guarantees LESS than the amount baked into the
 * steps, the batch cannot cover `spend + fee` and must not be signed.
 *
 * A higher guarantee is fine — the surplus simply stays at the intermediary.
 */
export const quoteMustNotHaveMoved = (
  bakedAmount: string,
  returnedMinAmountOut: string,
) => {
  if (BigInt(returnedMinAmountOut) < BigInt(bakedAmount)) {
    failGuard(
      'QUOTE_MOVED',
      `quote moved: steps baked ${bakedAmount} but the service now guarantees ${returnedMinAmountOut}`,
    );
  }
};
