import type { DetectedWallet, PluggableWallet } from '@/detect/types';

/** A wallet from a plug-in source: it carries its own connect and adapter. */
export const isPluggableWallet = (
  wallet: DetectedWallet,
): wallet is DetectedWallet & PluggableWallet =>
  typeof (wallet as Partial<PluggableWallet>).connect === 'function' &&
  typeof (wallet as Partial<PluggableWallet>).toConnector === 'function';
