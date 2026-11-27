import type { ConnectorModule } from './types';

/**
 * Each family's connector chunk, loaded after the first render so the wallet
 * SDKs stay out of the start-up bundle. A module of its own so tests can stand
 * in for the loads.
 */
export const connectorLoaders: Record<
  'appKit' | 'near' | 'stellar',
  () => Promise<ConnectorModule>
> = {
  appKit: () => import('./AppKitConnector'),
  near: () => import('./NearConnector'),
  stellar: () => import('./StellarConnector'),
};
