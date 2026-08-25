import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';

import { CloseIcon } from '@/connect/icons/CloseIcon';
import { WalletOptionCard } from '@/connect/WalletOptionCard';
import type { WalletOption } from '@/connect/types';

export type WalletSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  /**
   * Rows to render, in order. Ready-made ones are exported as
   * `EVM_SOLANA_WALLET_OPTION`, `NEAR_WALLET_OPTION` and
   * `STELLAR_WALLET_OPTION` — pass only those whose connector you installed.
   */
  options: readonly WalletOption[];
  /** Receives the selected option's `id`; wire it to `useWalletSelector.select`. */
  onSelect: (id: string) => void;
  title?: string;
};

/**
 * Chain-agnostic connect modal.
 *
 * The widget's version hardcoded the three rows and their `onSelect*` callbacks,
 * which is why it could not be reused without pulling every chain SDK. This one
 * renders whatever options it is handed.
 */
export const WalletSelectorModal = ({
  open,
  onClose,
  options,
  onSelect,
  title = 'Connect wallet',
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
              {title}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {options.map((option) => (
              <WalletOptionCard
                key={option.id}
                onClick={() => onSelect(option.id)}
                title={option.title}
                description={option.description}
                icons={option.icons}
              />
            ))}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
