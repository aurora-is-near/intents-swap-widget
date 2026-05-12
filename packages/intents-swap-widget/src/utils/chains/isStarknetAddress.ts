export const isStarknetAddress = (
  address: string,
): address is `0x${string}` => {
  return /^0x[0-9a-fA-F]{1,64}$/.test(address);
};
