import { failGuard } from '@/errors';

/** The bridged amount must be able to pay for the batch it funds. */
export const amountMustExceedFee = (
  grossAmount: string,
  networkFee: string,
) => {
  if (BigInt(grossAmount) - BigInt(networkFee) <= 0n) {
    failGuard(
      'FEE_EXCEEDS_AMOUNT',
      `network fee (${networkFee}) exceeds the delivered amount (${grossAmount})`,
    );
  }
};
