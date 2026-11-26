/**
 * `min(virtual balance, borrow cap − total debt when a cap is set)`, never
 * below zero. The cap is in whole tokens, so it is scaled by the decimals.
 */
export const availableLiquidity = ({
  virtualBalance,
  borrowCap,
  totalDebt,
  decimals,
}: {
  virtualBalance: bigint;
  borrowCap: bigint;
  totalDebt: bigint;
  decimals: bigint;
}): bigint => {
  const capRoom =
    borrowCap > 0n ? borrowCap * 10n ** decimals - totalDebt : virtualBalance;

  const available = capRoom < virtualBalance ? capRoom : virtualBalance;

  return available > 0n ? available : 0n;
};
