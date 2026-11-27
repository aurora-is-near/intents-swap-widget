/**
 * Loads the NEAR and Stellar connectors' chunk. A module of its own so tests
 * can stand in for the load.
 */
export const loadChainConnectors = () => import('./ChainConnectors');
