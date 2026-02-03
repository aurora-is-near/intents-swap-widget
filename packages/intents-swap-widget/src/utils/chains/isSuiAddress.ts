export const isSuiAddress = (addr: string) =>
  /^0x[0-9a-fA-F]{40,64}$/.test(addr) && addr.length > 42;
