// Account IDs (G..., 56 chars) and muxed accounts (M..., 69 chars).
export const isStellarAddress = (address: string) => {
  return /^(G[A-Z2-7]{55}|M[A-Z2-7]{68})$/.test(address);
};
