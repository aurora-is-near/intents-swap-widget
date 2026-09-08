import { createPublicClient, http } from 'viem';
import { monad } from 'viem/chains';

import { MONAD_RPC } from './constants';

export const monadPublic = createPublicClient({
  chain: monad,
  transport: http(MONAD_RPC, { batch: true }),
});
