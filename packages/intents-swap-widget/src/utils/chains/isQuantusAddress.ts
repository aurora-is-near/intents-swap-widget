// SS58 with Quantus' network prefix: always `qz` + 47 base58 characters.
export const isQuantusAddress = (addr: string) =>
  /^qz[1-9A-HJ-NP-Za-km-z]{47}$/.test(addr);
