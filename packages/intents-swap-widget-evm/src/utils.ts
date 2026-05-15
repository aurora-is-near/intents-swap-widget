import type { Chains } from '@aurora-is-near/intents-swap-widget';

export const isEvmAddress = (a: string): boolean =>
  /^0x[a-fA-F0-9]{40}$/.test(a);

// NEAR virtual chains route transfers through the exitToNear precompile
// instead of a standard ERC-20 transfer. Aurora Mainnet is the only one
// today but additional VCs could slot in here.
const VIRTUAL_CHAINS: ReadonlySet<Chains> = new Set(['aurora']);

export const isVirtualChain = (chain: Chains): boolean =>
  VIRTUAL_CHAINS.has(chain);
