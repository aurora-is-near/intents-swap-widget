import type { Token } from '@/types/token';
import type { IncidentScope } from '@/utils/feeServiceIncidents';

type QuoteToken = Pick<Token, 'assetId' | 'blockchain' | 'isIntent'>;

type Side = 'deposit' | 'withdraw';

// `*`, an empty direction or anything unknown pauses both ways.
const pausesSide = ({ direction }: IncidentScope, side: Side) =>
  direction !== (side === 'deposit' ? 'withdraw' : 'deposit');

const coversToken = (
  { scopeType, scopeValue }: IncidentScope,
  token: QuoteToken,
) => {
  if (scopeValue === '*') {
    return true;
  }

  if (scopeType === 'token') {
    return scopeValue === token.assetId;
  }

  return scopeValue.toLowerCase() === token.blockchain.toLowerCase();
};

const findForSide = (
  incidents: ReadonlyArray<IncidentScope>,
  token: QuoteToken | undefined,
  side: Side,
) =>
  // A token on intents never touches its chain, so the chain can't be the
  // reason its quote failed.
  !token || token.isIntent
    ? undefined
    : incidents.find(
        (incident) =>
          pausesSide(incident, side) && coversToken(incident, token),
      );

/**
 * The incident that would explain a failed quote: a pause on the source
 * token's chain (or the token itself) for deposits, or on the target's for
 * withdrawals.
 */
export const findQuoteIncident = (
  incidents: ReadonlyArray<IncidentScope>,
  sourceToken: QuoteToken | undefined,
  targetToken: QuoteToken | undefined,
): IncidentScope | undefined =>
  findForSide(incidents, sourceToken, 'deposit') ??
  findForSide(incidents, targetToken, 'withdraw');
