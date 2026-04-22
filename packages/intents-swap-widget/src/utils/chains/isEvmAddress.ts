export const isEvmAddress = (address: string): address is `0x${string}` => {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
};
