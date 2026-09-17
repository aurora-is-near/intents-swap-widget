// Classic (r...) addresses and mainnet X-addresses (X...), which encode a
// destination tag alongside the account.
export const isXrpAddress = (addr: string) =>
  /^(r[1-9A-HJ-NP-Za-km-z]{24,34}|X[1-9A-HJ-NP-Za-km-z]{46})$/.test(addr);
