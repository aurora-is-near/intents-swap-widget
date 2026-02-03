export const isLtcAddress = (addr: string) =>
  /^(ltc1[a-z0-9]{39,59}|[LM3][a-km-zA-HJ-NP-Z1-9]{26,33})$/.test(addr);
