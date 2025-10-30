import { CHAINS } from '@/constants/chains';
import type { Chains } from '@/types/chain';

export const isValidChain = (name: string): name is Chains => {
  return Object.values(CHAINS).includes(name as Chains);
};
