export const isTronAddress = (addr: string) =>
  /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);
