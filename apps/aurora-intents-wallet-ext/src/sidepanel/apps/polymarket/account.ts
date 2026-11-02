import { isValidChainAddress } from '@aurora-is-near/intents-swap-widget';

/** `null` means the chain is unknown to the validator, which is not a pass. */
export const isPolygonAddress = (address: string) =>
  isValidChainAddress('pol', address) === true;
