export const isSolanaAddress = (address: string): boolean => {
  // Using regex validation instead of @solana/web3.js PublicKey constructor
  // to avoid adding ~1.5MB dependency to the widget package.
  // This validates base58 format and length, which is sufficient for balance checks.
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  return base58Regex.test(address);
};
