/**
 * Sum every recipient's fee (basis points) from a quote's applied appFees and
 * return it as a percentage string, e.g. 25 bps -> "0.25". The server may split
 * the fee across several recipients, so all entries are combined. Returns null
 * when there is no fee so callers can omit the row.
 *
 * Accepts a readonly array so it can be fed a valtio snapshot of the quote.
 */
export const getAppFeesPercent = (
  appFees: readonly { fee: number }[] | undefined,
): string | null => {
  if (!appFees?.length) {
    return null;
  }

  const totalBps = appFees.reduce((sum, { fee }) => sum + fee, 0);

  if (totalBps <= 0) {
    return null;
  }

  return (totalBps / 100).toFixed(2);
};
