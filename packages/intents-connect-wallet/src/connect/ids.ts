/**
 * Connector ids, shared by the modal presets and the connector hooks.
 *
 * Deliberately its own module with no imports: `presets.ts` pulls in every
 * wallet SVG (~228KB), and a connector subpath reading an id from there would
 * drag all of it in for a string constant.
 */
export const CONNECTOR_IDS = {
  evmSolana: 'evm-solana',
  near: 'near',
  stellar: 'stellar',
} as const;

export type ConnectorId = (typeof CONNECTOR_IDS)[keyof typeof CONNECTOR_IDS];
