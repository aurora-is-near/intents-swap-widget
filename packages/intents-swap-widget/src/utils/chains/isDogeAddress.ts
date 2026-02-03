export const isDogeAddress = (addr: string) =>
  /^[DA9][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr);
