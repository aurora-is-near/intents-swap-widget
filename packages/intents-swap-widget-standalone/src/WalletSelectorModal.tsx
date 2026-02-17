import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { CoinBaseIcon } from './icons/CoinBaseIcon';
import { MetaMaskIcon } from './icons/MetaMaskIcon';
import { TrustIcon } from './icons/TrustIcon';
import { PhantomIcon } from './icons/PhantomIcon';
import { CloseIcon } from './icons/CloseIcon';
import { MyNearWalletIcon } from './icons/MyNearWalletIcon';
import { MeteorIcon } from './icons/MeteorIcon';
import { NearIcon } from './icons/NearIcon';
import { HotWalletIcon } from './icons/HotWalletIcon';
import { WalletOptionCard } from './WalletOptionCard';

type WalletSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectNear: () => void;
  onSelectEvmSolana: () => void;
};

export const WalletSelectorModal = ({
  open,
  onClose,
  onSelectNear,
  onSelectEvmSolana,
}: WalletSelectorModalProps) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      style={{ position: 'relative', zIndex: 50 }}>
      <DialogBackdrop
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}>
        <DialogPanel
          style={{
            width: '100%',
            maxWidth: 400,
            borderRadius: 16,
            backgroundColor: '#202020',
            padding: 24,
          }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
            <DialogTitle
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#F3F3F5',
                margin: 0,
                flex: 1,
                textAlign: 'center',
              }}>
              Connect wallet
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: 'none',
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
              <CloseIcon />
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
            <WalletOptionCard
              onClick={onSelectEvmSolana}
              title="EVM / Solana"
              description="Connect via MetaMask, Trust, Phantom, etc..."
              icons={[
                { Icon: MetaMaskIcon },
                { Icon: TrustIcon },
                { Icon: PhantomIcon, backgroundColor: '#ab9ff2' },
                { Icon: CoinBaseIcon, backgroundColor: '#0052ff' },
              ]}
            />
            <WalletOptionCard
              onClick={onSelectNear}
              title="NEAR"
              description="Connect via Hot, Meteor, Near Mobile, etc..."
              icons={[
                { Icon: NearIcon, backgroundColor: '#ecedf5' },
                { Icon: MyNearWalletIcon },
                { Icon: MeteorIcon },
                { Icon: HotWalletIcon },
              ]}
            />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
