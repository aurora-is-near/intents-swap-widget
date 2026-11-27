import { createContext } from 'react';

import type { WalletSession } from '../types';

/** Filled by `WalletSessionProvider`; read through `useWallet`. */
export const WalletSessionContext = createContext<WalletSession | null>(null);
