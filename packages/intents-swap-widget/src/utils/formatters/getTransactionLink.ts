export const getTransactionLink = (
  hash: string,
  { isDirectNearTransfer }: { isDirectNearTransfer?: boolean } = {},
): string => {
  if (isDirectNearTransfer) {
    return `https://nearblocks.io/txns/${hash}`;
  }

  return `https://explorer.near-intents.org/transactions/${hash}`;
};
