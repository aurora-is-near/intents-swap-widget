import { CHAINS_LIST } from './constants';
import { CHAIN_ICONS } from './icons';

export const CHAINS = Object.values(CHAINS_LIST).map((chain) => ({
  id: chain.id,
  label: chain.label,
  icon: CHAIN_ICONS[chain.id],
}));
