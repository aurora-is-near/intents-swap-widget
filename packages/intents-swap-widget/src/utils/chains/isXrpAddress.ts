export const isXrpAddress = (addr: string) =>
  /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(addr);
