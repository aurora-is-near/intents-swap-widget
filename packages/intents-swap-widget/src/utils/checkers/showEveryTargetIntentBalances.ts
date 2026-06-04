// Feature flag (URL param): when `?showEveryTargetIntentBalances=1` is present,
// the target token list also surfaces intent tokens the user holds a balance of
// on another chain (e.g. ZEC on Zcash), instead of only the deduped on-Near
// representative. Off by default.
export const showEveryTargetIntentBalances = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);

  return searchParams.get('showEveryTargetIntentBalances') === '1';
};
