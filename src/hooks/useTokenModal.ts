import { useCallback, useState } from 'react';
import { TokenModalState } from '../widgets/types';

export const useTokenModal = ({
  onMsg,
}: {
  onMsg?: (msg: { type: 'on_tokens_modal_toggled'; isOpen: boolean }) => void;
}) => {
  const [tokenModalOpen, setTokenModalOpen] = useState<TokenModalState>('none');

  const updateTokenModalState = useCallback(
    (state: TokenModalState) => {
      setTokenModalOpen(state);
      onMsg?.({
        type: 'on_tokens_modal_toggled',
        isOpen: state !== 'none',
      });
    },
    [onMsg],
  );

  return { tokenModalOpen, updateTokenModalState };
};
