import { useSnapshot } from 'valtio';
import { derive } from 'derive-valtio';

import { getIsNativeNearDeposit } from './computed/getIsNativeNearDeposit';
import { getIsDirectTokenOnNearDeposit } from './computed/getIsDirectTokenOnNearDeposit';
import { WidgetError } from '@/errors';
import { machine } from '@/machine/machine';
import { guardStates } from '@/machine/guards';
import { getUsdTradeDelta } from '@/machine/computed/getUsdTradeDelta';
import { getIsDirectNonNearWithdrawal } from '@/machine/computed/getIsDirectNonNearWithdrawal';
import { getIsDirectTokenOnNearTransfer } from '@/machine/computed/getIsDirectTokenOnNearTransfer';
import { getIsDirectNearTokenWithdrawal } from '@/machine/computed/getIsDirectNearTokenWithdrawal';
import { getIsSameAssetDiffChainWithdrawal } from '@/machine/computed/getIsSameAssetDiffChainWithdrawal';
import type { MachineState } from '@/machine/machine';
import type { Context } from '@/machine/context';

const store = machine.getStore();

const computed = derive({
  usdTradeDelta: (get) => getUsdTradeDelta(get(store.context)),
  isDirectNearTokenWithdrawal: (get) =>
    getIsDirectNearTokenWithdrawal(get(store.context)),
  isDirectNonNearWithdrawal: (get) =>
    getIsDirectNonNearWithdrawal(get(store.context)),
  isDirectTokenOnNearDeposit: (get) =>
    getIsDirectTokenOnNearDeposit(get(store.context)),
  isNativeNearDeposit: (get) => getIsNativeNearDeposit(get(store.context)),
  isSameAssetDiffChainWithdrawal: (get) =>
    getIsSameAssetDiffChainWithdrawal(get(store.context)),
  isDirectTokenOnNearTransfer: (get) =>
    getIsDirectTokenOnNearTransfer(get(store.context)),
});

export const useComputedSnapshot = () => {
  return useSnapshot(computed);
};

export const useUnsafeSnapshot = () => {
  const snap = useSnapshot(store);

  return {
    state: snap.state,
    ctx: snap.context,
  };
};

export const useSafeSnapshot = <S extends MachineState>(state: S) => {
  const snap = useSnapshot(store);
  const isValid = guardStates(snap.context, [state]);

  if (!isValid) {
    throw new WidgetError(
      `[WIDGET] Attempt to access snapshot for ${state} state while context does not match`,
    );
  }

  type Ctx = Extract<Context, { state: S }>;

  return snap.context as Ctx;
};
