export const isBtcAddress = (addr: string) =>
  /^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(addr);
