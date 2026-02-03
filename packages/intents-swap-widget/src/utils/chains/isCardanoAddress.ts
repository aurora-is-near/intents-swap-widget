export const isCardanoAddress = (addr: string) =>
  /^(addr1|addr_test1)[a-z0-9]{20,}$/.test(addr);
