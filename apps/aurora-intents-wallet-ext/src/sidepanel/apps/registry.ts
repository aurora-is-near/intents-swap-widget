import type { Chains } from '@aurora-is-near/intents-swap-widget';

export type IntegrationId = 'polymarket';

export type Integration = {
  id: IntegrationId;
  name: string;
  description: string;
  /** Brand color for the app's mark (no logo assets yet). */
  accent: string;
  /** Where the deposit lands. */
  chain: Chains;
  /** What the app receives. */
  arrivesAs: string;
  homeUrl: string;
  /** The Intents Connect recipe intent, which tells executions apart. */
  intent: string;
};

export const INTEGRATIONS: Integration[] = [
  {
    id: 'polymarket',
    name: 'Polymarket',
    description: 'Top up your Polymarket account from any chain',
    accent: '#2D9CDB',
    chain: 'pol',
    arrivesAs: 'pUSD',
    homeUrl: 'https://polymarket.com',
    intent: 'polymarket_deposit',
  },
];

/** The app an execution belongs to, by its recipe intent. */
export const findIntegrationByIntent = (intent: unknown) =>
  INTEGRATIONS.find((integration) => integration.intent === intent);
