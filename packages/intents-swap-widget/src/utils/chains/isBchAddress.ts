export const isBchAddress = (addr: string) => {
  const a = addr.trim().toLowerCase();

  // Supports both legacy and CashAddr formats (i.e. with or without the "bitcoincash:" prefix)
  return (
    /^(bitcoincash:)?(q|p)[023456789acdefghjklmnpqrstuvwxyz]{41}$/.test(a) ||
    /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr.trim())
  );
};
