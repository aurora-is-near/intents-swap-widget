import { useCallback, useEffect } from 'react';
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
      onFocus(initialFocusedIndex);
      listRef?.scrollToIndex(initialFocusedIndex, { align: 'nearest' });

      // required to prevent initial scroll on focus
      // which causes list's jump
      setTimeout(() => {
        virtualListDiv.focus({ preventScroll: true });
      }, 0);
    }
  });

  const handleBlur = useCallback(
    (event: FocusEvent) => {
      const virtualListDiv = document.getElementById(LIST_CONTAINER_ID);

      if (event.target === virtualListDiv) {
        onBlur();
      }
    },
    [onBlur],
  );

  useEffect(() => {
    const virtualListDiv = document.getElementById(LIST_CONTAINER_ID);

    virtualListDiv?.addEventListener('blur', handleBlur);

    return () => {
      virtualListDiv?.removeEventListener('blur', handleBlur);
    };
  }, [handleBlur]);
};
