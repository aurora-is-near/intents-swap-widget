import {
  ALL_WALLET_OPTIONS,
  WalletSelectorModal,
} from '@aurora-is-near/intents-connect-wallet/connect';

import { WALLET_MODAL_THEME } from '../walletModalTheme';

type ConnectModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  /** Connector ids whose chunk did not fail to load. */
  available: readonly string[];
};

/**
 * The wallet package's connect modal in Borrow's theme, with a row per
 * family that loaded. Its own chunk, loaded when the modal first opens: the
 * dialog library and the wallet icons are not needed before.
 */
export function ConnectModal({
  open,
  onClose,
  onSelect,
  available,
}: ConnectModalProps) {
  return (
    <WalletSelectorModal
      onClose={onClose}
      onSelect={onSelect}
      open={open}
      options={ALL_WALLET_OPTIONS.filter((option) =>
        available.includes(option.id),
      )}
      theme={WALLET_MODAL_THEME}
    />
  );
}
