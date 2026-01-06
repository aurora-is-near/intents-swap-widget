import { cloneElement } from 'react';
import { CHAINS_LIST } from './constants';
import { CHAIN_ICONS } from './icons';

export const CHAINS = Object.values(CHAINS_LIST).map((chain) => {
  return {
    id: chain.id,
    label: chain.label,
    icon: cloneElement(CHAIN_ICONS[chain.id], {
      width: '100%',
      height: '100%',
    }),
  };
});
