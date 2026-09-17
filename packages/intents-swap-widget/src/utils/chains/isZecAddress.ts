// Transparent addresses only: t1 (P2PKH) and t3 (P2SH). Shielded and
// unified addresses are not supported as swap destinations.
export const isZecAddress = (addr: string) =>
  /^t[13][a-km-zA-HJ-NP-Z1-9]{33}$/.test(addr);
