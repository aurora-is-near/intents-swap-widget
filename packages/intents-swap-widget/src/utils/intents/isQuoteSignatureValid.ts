import { verifyQuoteSignature } from '@defuse-protocol/one-click-sdk-typescript';
import type {
  QuoteRequest,
  QuoteResponse,
} from '@defuse-protocol/one-click-sdk-typescript';

// Assets the fee service routes in two legs (1Click, then a partner such as
// ChangeHero) carry this prefix. The fee service rewrites the signed fields of
// those quotes, deposit address included, so 1Click's signature cannot cover
// them and the fee service is the trust boundary.
const TWO_LEG_ASSET_PREFIX = 'aurora:';

// Anyone between us and 1Click could get a genuine signature for a modified
// request, so these signed fields must match what we sent. Not exhaustive:
// only fields that decide where funds go or what they're swapped for, since
// any field the fee service or 1Click rewrites here would block every swap.
const BOUND_FIELDS = [
  'recipient',
  'recipientType',
  'virtualChainRecipient',
  'customRecipientMsg',
  'refundTo',
  'refundType',
  'virtualChainRefundRecipient',
  'originAsset',
  'destinationAsset',
  'amount',
  'swapType',
  'slippageTolerance',
] as const satisfies readonly (keyof QuoteRequest)[];

const isTwoLegAsset = (assetId: string) =>
  assetId.toLowerCase().startsWith(TWO_LEG_ASSET_PREFIX);

const isSameDeadline = (a?: string, b?: string) =>
  a === b || (!!a && !!b && Date.parse(a) === Date.parse(b));

// A genuine signature only proves 1Click signed *a* quote, so tie it to this
// request. The deadline doesn't stop a field being swapped (an attacker can
// copy ours), but the widget generates a new one per request, so matching it
// stops an old signed quote being replayed later.
const isSignedForRequest = (request: QuoteRequest, response: QuoteResponse) =>
  BOUND_FIELDS.every(
    (field) =>
      (response.quoteRequest[field] ?? undefined) ===
      (request[field] ?? undefined),
  ) && isSameDeadline(response.quoteRequest.deadline, request.deadline);

/**
 * Whether a quote is the one 1Click signed for this request, unaltered.
 * Two-leg quotes are exempt, and that is decided from the request we sent
 * rather than anything in the response, so tampering with the response can't
 * opt a quote out.
 */
export const isQuoteSignatureValid = (
  request: QuoteRequest,
  response: QuoteResponse,
  managerPublicKey?: string,
): boolean => {
  if (
    isTwoLegAsset(request.originAsset) ||
    isTwoLegAsset(request.destinationAsset)
  ) {
    return true;
  }

  if (!response.quoteRequest || !isSignedForRequest(request, response)) {
    return false;
  }

  return verifyQuoteSignature(response, managerPublicKey);
};
