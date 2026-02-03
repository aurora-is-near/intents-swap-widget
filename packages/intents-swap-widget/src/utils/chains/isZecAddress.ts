export const isZecAddress = (addr: string) =>
  /^t1[a-km-zA-HJ-NP-Z1-9]{33}$/.test(addr);
