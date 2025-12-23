import { useEffect } from 'react';
import type { VListHandle } from 'virtua';

import { LIST_CONTAINER_ID } from '../constants';

import { useHandleKeyDown } from '@/hooks/useHandleKeyDown';

type Args = {
  initialFocusedIndex: number;
  listRef: VListHandle | null;
  onFocus: (index: number) => void;
  onBlur: () => void;
};

export const useFocusOnList = ({
  initialFocusedIndex,
  listRef,
  onFocus,
  onBlur,
}: Args) => {
  useHandleKeyDown('ArrowDown', () => {
    const virtualListDiv = document.getElementById(LIST_CONTAINER_ID);

    if (virtualListDiv && document.activeElement !== virtualListDiv) {
      virtualListDiv.focus({ preventScroll: true });

      onFocus(initialFocusedIndex);
      listRef?.scrollToIndex(initialFocusedIndex, { align: 'start' });
    }
  });

  useEffect(() => {
    const handleFocusChange = () => {
      const virtualListDiv = document.getElementById(LIST_CONTAINER_ID);

      if (document.activeElement !== virtualListDiv) {
        onBlur();
      }
    };

    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);

    handleFocusChange();

    return () => {
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
    };
  }, [onBlur]);
};
