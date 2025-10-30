export const formatTxHash = (hash: string) => {
  if (hash.length <= 10) {
    return hash;
  }

  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};
