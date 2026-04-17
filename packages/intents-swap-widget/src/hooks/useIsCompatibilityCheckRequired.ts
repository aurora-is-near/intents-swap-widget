import { useConfig } from '@/config';
import { useUnsafeSnapshot } from '@/machine/snap';
import { localStorageTyped } from '@/utils/localstorage';

export const useIsCompatibilityCheckRequired = () => {
  const { ctx } = useUnsafeSnapshot();
  const { enableAccountAbstraction } = useConfig();
  const verifiedWallets = localStorageTyped.getItem('verifiedWallets');

  return !!(
    ctx.walletAddress &&
    enableAccountAbstraction &&
    !verifiedWallets.includes(ctx.walletAddress)
  );
};
