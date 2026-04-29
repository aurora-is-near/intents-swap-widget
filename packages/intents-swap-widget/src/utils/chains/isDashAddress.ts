export const isDashAddress = (addr: string) =>
  /^[X78][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr.trim());
