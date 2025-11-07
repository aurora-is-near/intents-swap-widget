import { useSnapshot } from 'valtio';
import { derive } from 'derive-valtio';

import { getIsDirectNearDeposit } from './computed/getIsDirectNearDeposit';
import { WidgetError } from '@/errors';
import { machine } from '@/machine/machine';
import { guardStates } from '@/machine/guards';
import { getUsdTradeDelta } from '@/machine/computed/getUsdTradeDelta';
import { getIsDirectTransfer } from '@/machine/computed/getIsDirectTransfer';
import { getIsDirectNonNearWithdrawal } from '@/machine/computed/getIsDirectNonNearWithdrawal';
import { getIsNearToIntentsSameAssetTransfer } from '@/machine/computed/getIsNearToIntentsSameAssetTransfer';
import type { MachineState } from '@/machine/machine';
import type { Context } from '@/machine/context';

const store = machine.getStore();

let computed: ReturnType<typeof derive> | undefined;

const getComputed = () => {
  if (!computed) {
    computed = derive({
      usdTradeDelta: (get) => getUsdTradeDelta(get(store.context)),
      isDirectTransfer: (get) => getIsDirectTransfer(get(store.context)),
      isNearToIntentsSameAssetTransfer: (get) =>
        getIsNearToIntentsSameAssetTransfer(get(store.context)),
      isDirectNearDeposit: (get) => getIsDirectNearDeposit(get(store.context)),
      isDirectNonNearWithdrawal: (get) =>
        getIsDirectNonNearWithdrawal(get(store.context)),
    });
  }

  return computed;
};

export const useComputedSnapshot = () => {
  return useSnapshot(getComputed());
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
