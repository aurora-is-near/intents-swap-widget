export const isEvmAddress = (a: string): boolean =>
  /^0x[a-fA-F0-9]{40}$/.test(a);

// NEAR virtual chains route transfers through the exitToNear precompile instead
// of a standard ERC-20 transfer. Aurora Mainnet is the only one today but
// additional VCs could slot in here.
const VIRTUAL_CHAINS: ReadonlySet<string> = new Set(['aurora']);

export const isVirtualChain = (chain: string): boolean =>
  VIRTUAL_CHAINS.has(chain);
