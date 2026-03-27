import { useEffect, useMemo, useState } from 'react';

import {
  LIST_CONTAINER_ID,
  MAX_LIST_VIEW_AREA_HEIGHT,
  MIN_LIST_VIEW_AREA_HEIGHT,
  TX_ITEM_HEIGHT,
} from './constants';

type Params = {
  transactionsCount: number;
  hasNextPage: boolean;
};

export const useTransactionHistoryListHeight = ({
  transactionsCount,
  hasNextPage,
}: Params) => {
  const [availableListHeight, setAvailableListHeight] = useState(
    MAX_LIST_VIEW_AREA_HEIGHT,
  );

  useEffect(() => {
    const updateAvailableListHeight = () => {
      const listElement = document.getElementById(LIST_CONTAINER_ID);

      if (!listElement) {
        return;
      }

      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;

      const bottomPadding = 24;
      const nextHeight =
        viewportHeight -
        listElement.getBoundingClientRect().top -
        bottomPadding;

      setAvailableListHeight(
        Math.max(
          MIN_LIST_VIEW_AREA_HEIGHT,
          Math.min(MAX_LIST_VIEW_AREA_HEIGHT, nextHeight),
        ),
      );
    };

    updateAvailableListHeight();
    window.addEventListener('resize', updateAvailableListHeight);
    window.visualViewport?.addEventListener(
      'resize',
      updateAvailableListHeight,
    );

    return () => {
      window.removeEventListener('resize', updateAvailableListHeight);
      window.visualViewport?.removeEventListener(
        'resize',
        updateAvailableListHeight,
      );
    };
  }, [transactionsCount, hasNextPage]);

  return useMemo(() => {
    const actionsHeight = hasNextPage ? TX_ITEM_HEIGHT : 0;
    const contentHeight = transactionsCount * TX_ITEM_HEIGHT + actionsHeight;

    return Math.max(
      MIN_LIST_VIEW_AREA_HEIGHT,
      Math.min(MAX_LIST_VIEW_AREA_HEIGHT, availableListHeight, contentHeight),
    );
  }, [availableListHeight, hasNextPage, transactionsCount]);
};
