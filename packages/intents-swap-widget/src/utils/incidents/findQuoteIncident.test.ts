import type { Token } from '@/types/token';
import type { IncidentScope } from '@/utils/feeServiceIncidents';

import { findQuoteIncident } from './findQuoteIncident';

type QuoteToken = Pick<Token, 'assetId' | 'blockchain' | 'isIntent'>;

const ethOnEth: QuoteToken = {
  assetId: 'nep141:eth.omft.near',
  blockchain: 'eth',
  isIntent: false,
};

const solOnSol: QuoteToken = {
  assetId: 'nep141:sol.omft.near',
  blockchain: 'sol',
  isIntent: false,
};

const onIntents = (token: QuoteToken): QuoteToken => ({
  ...token,
  isIntent: true,
});

const chain = (
  scopeValue: string,
  direction?: string | null,
): IncidentScope => ({ scopeType: 'chain', scopeValue, direction });

describe('findQuoteIncident', () => {
  it('finds a deposit pause on the source chain', () => {
    const incident = chain('eth', 'deposit');

    expect(findQuoteIncident([incident], ethOnEth, solOnSol)).toBe(incident);
  });

  it('finds a withdrawal pause on the target chain', () => {
    const incident = chain('sol', 'withdraw');

    expect(findQuoteIncident([incident], ethOnEth, solOnSol)).toBe(incident);
  });

  it.each([['*'], [null], [undefined], ['']])(
    'treats direction %p as pausing both ways',
    (direction) => {
      const incident = chain('eth', direction);

      expect(findQuoteIncident([incident], ethOnEth, solOnSol)).toBe(incident);
      expect(findQuoteIncident([incident], solOnSol, ethOnEth)).toBe(incident);
    },
  );

  it('ignores a pause in the direction the token does not move', () => {
    expect(
      findQuoteIncident([chain('eth', 'withdraw')], ethOnEth, solOnSol),
    ).toBeUndefined();
    expect(
      findQuoteIncident([chain('sol', 'deposit')], ethOnEth, solOnSol),
    ).toBeUndefined();
  });

  it('ignores the chain of a token held on intents', () => {
    const incidents = [chain('eth'), chain('sol')];

    expect(
      findQuoteIncident(incidents, onIntents(ethOnEth), onIntents(solOnSol)),
    ).toBeUndefined();
    expect(findQuoteIncident(incidents, onIntents(ethOnEth), solOnSol)).toEqual(
      chain('sol'),
    );
  });

  it('matches chain_all scopes like chain scopes, ignoring case', () => {
    const incident: IncidentScope = {
      scopeType: 'chain_all',
      scopeValue: 'ETH',
      direction: '*',
    };

    expect(findQuoteIncident([incident], ethOnEth, solOnSol)).toBe(incident);
  });

  it('matches a maintenance window covering every network', () => {
    const incident = chain('*', '*');

    expect(findQuoteIncident([incident], ethOnEth, solOnSol)).toBe(incident);
  });

  it('matches a token pause by asset ID, not by chain', () => {
    const tokenPause: IncidentScope = {
      scopeType: 'token',
      scopeValue: ethOnEth.assetId,
    };

    const otherToken: IncidentScope = {
      scopeType: 'token',
      scopeValue: 'eth',
    };

    expect(findQuoteIncident([tokenPause], ethOnEth, solOnSol)).toBe(
      tokenPause,
    );
    expect(findQuoteIncident([otherToken], ethOnEth, solOnSol)).toBeUndefined();
  });

  it('finds nothing for unrelated chains or missing tokens', () => {
    expect(
      findQuoteIncident([chain('btc'), chain('near')], ethOnEth, solOnSol),
    ).toBeUndefined();
    expect(
      findQuoteIncident([chain('eth')], undefined, undefined),
    ).toBeUndefined();
    expect(findQuoteIncident([], ethOnEth, solOnSol)).toBeUndefined();
  });
});
