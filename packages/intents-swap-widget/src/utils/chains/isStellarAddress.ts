export const isStellarAddress = (address: string) => {
  return /^G[A-Z2-7]{55}$/.test(address);
};
