export const isAleoAddress = (addr: string) =>
  /^aleo1[a-z0-9]{58}$/.test(addr);
