import type { ValueOf } from '@/types/utils';
import type { Chains } from '@/types/chain';

export const revertAlchemyChainsMap = <
  T extends Partial<Record<Chains, string>>,
>(
  chainsMap: T,
) => {
  return Object.fromEntries(
    Object.entries(chainsMap).map(([key, value]) => [value, key]),
  ) as {
    [V in ValueOf<T> & (string | number | symbol)]: keyof typeof chainsMap;
  };
};
