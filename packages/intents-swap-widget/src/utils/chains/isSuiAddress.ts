// Sui addresses are always 32 bytes, rendered as 0x + 64 hex characters.
export const isSuiAddress = (addr: string) => /^0x[0-9a-fA-F]{64}$/.test(addr);
