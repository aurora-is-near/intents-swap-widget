import type { SupportedToken } from '@aurora-is-near/intents-connect';

import type { SupplyOption } from './types';

/** An option Intents Connect can deliver into, with the token it delivers. */
export type DeliverableOption = SupplyOption & {
  /** The 1Click asset id of the option's token. */
  destinationAsset: string;
};

/** The options whose token is among the service's destinations. */
export const deliverableOptions = (
  options: readonly SupplyOption[],
  destinations: readonly SupportedToken[],
): DeliverableOption[] =>
  options.flatMap((option) => {
    // A native token is listed with an empty contract address.
    const token = destinations.find(
      ({ blockchain, contractAddress }) =>
        blockchain === option.chain &&
        (contractAddress ?? '').toLowerCase() ===
          (option.tokenAddress ?? '').toLowerCase(),
    );

    return token?.assetId
      ? [{ ...option, destinationAsset: token.assetId }]
      : [];
  });

/** Wrapped forms a native token is supplied as. */
const WRAPPED: Record<string, string> = {
  ETH: 'WETH',
  POL: 'WPOL',
  MON: 'WMON',
};

/** The option the same token goes into, if any: USDC → USDC, ETH → WETH. */
export const matchingOption = (
  symbol: string,
  options: readonly DeliverableOption[],
): DeliverableOption | undefined => {
  const wanted = [symbol, WRAPPED[symbol.toUpperCase()]]
    .filter(Boolean)
    .map((value) => value!.toUpperCase());

  return options.find(
    (option) =>
      !option.unavailable && wanted.includes(option.symbol.toUpperCase()),
  );
};
