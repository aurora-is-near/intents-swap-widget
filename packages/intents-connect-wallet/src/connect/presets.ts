import { CoinBaseIcon } from '@/connect/icons/CoinBaseIcon';
import { FreighterIcon } from '@/connect/icons/FreighterIcon';
import { HotWalletIcon } from '@/connect/icons/HotWalletIcon';
import { MetaMaskIcon } from '@/connect/icons/MetaMaskIcon';
import { MeteorIcon } from '@/connect/icons/MeteorIcon';
import { MyNearWalletIcon } from '@/connect/icons/MyNearWalletIcon';
import { NearIcon } from '@/connect/icons/NearIcon';
import { PhantomIcon } from '@/connect/icons/PhantomIcon';
import { StellarIcon } from '@/connect/icons/StellarIcon';
import { TrustIcon } from '@/connect/icons/TrustIcon';
import { WalletConnectIcon } from '@/connect/icons/WalletConnectIcon';
import { XbullIcon } from '@/connect/icons/XbullIcon';
import { CONNECTOR_IDS } from '@/connect/ids';
import type { WalletOption } from '@/connect/types';

/**
 * Ready-made modal rows, identical to the widget's hardcoded ones. These are
 * pure presentation — icons and copy — so they live here rather than in the
 * chain subpaths, keeping the modal usable without any chain SDK installed.
 *
 * Pass only the options whose connector you actually installed.
 */
export const EVM_SOLANA_WALLET_OPTION: WalletOption = {
  id: CONNECTOR_IDS.evmSolana,
  title: 'EVM / Solana',
  description: 'Connect via MetaMask, Trust, Phantom, etc...',
  icons: [
    { Icon: MetaMaskIcon },
    { Icon: TrustIcon },
    { Icon: PhantomIcon, backgroundColor: '#ab9ff2' },
    { Icon: CoinBaseIcon, backgroundColor: '#0052ff' },
  ],
};

export const NEAR_WALLET_OPTION: WalletOption = {
  id: CONNECTOR_IDS.near,
  title: 'NEAR',
  description: 'Connect via Hot, Meteor, Near Mobile, etc...',
  icons: [
    { Icon: NearIcon, backgroundColor: '#ecedf5' },
    { Icon: MyNearWalletIcon },
    { Icon: MeteorIcon },
    { Icon: HotWalletIcon },
  ],
};

export const STELLAR_WALLET_OPTION: WalletOption = {
  id: CONNECTOR_IDS.stellar,
  title: 'Stellar',
  description: 'Connect via Freighter or xBull',
  icons: [
    { Icon: StellarIcon, backgroundColor: '#ecedf5' },
    { Icon: FreighterIcon },
    { Icon: XbullIcon, backgroundColor: '#202020' },
    { Icon: WalletConnectIcon, backgroundColor: '#5194f8' },
  ],
};

export const ALL_WALLET_OPTIONS: readonly WalletOption[] = [
  EVM_SOLANA_WALLET_OPTION,
  NEAR_WALLET_OPTION,
  STELLAR_WALLET_OPTION,
];
