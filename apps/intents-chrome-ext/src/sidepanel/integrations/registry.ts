export type IntegrationId = 'polymarket';

export type Integration = {
  id: IntegrationId;
  name: string;
  description: string;
  /** Brand color for the card's mark. */
  accent: string;
  homeUrl: string;
  /** Whether the tab URL belongs to this integration's site. */
  matchUrl: (url: string | undefined) => boolean;
};

// Exact host only: the content scripts (manifest `matches`) run nowhere else,
// so a subdomain would look supported but have no wallet bridge.
const hostMatches = (url: string | undefined, host: string) => {
  if (!url) {
    return false;
  }

  try {
    return new URL(url).hostname === host;
  } catch {
    return false;
  }
};

export const INTEGRATIONS: Integration[] = [
  {
    id: 'polymarket',
    name: 'Polymarket',
    description: 'Fund your Polymarket account with pUSD from any chain',
    accent: '#2D9CDB',
    homeUrl: 'https://polymarket.com',
    matchUrl: (url) => hostMatches(url, 'polymarket.com'),
  },
];

export const findIntegrationForUrl = (url: string | undefined) =>
  INTEGRATIONS.find((integration) => integration.matchUrl(url));
