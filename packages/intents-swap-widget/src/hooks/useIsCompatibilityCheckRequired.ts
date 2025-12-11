import { useUnsafeSnapshot } from '@/machine/snap';
import { localStorageTyped } from '@/utils/localstorage';

export const useIsCompatibilityCheckRequired = () => {
  const { ctx } = useUnsafeSnapshot();
  const verifiedWallets = localStorageTyped.getItem('verifiedWallets');

  return !!(ctx.walletAddress && !verifiedWallets.includes(ctx.walletAddress));
};
