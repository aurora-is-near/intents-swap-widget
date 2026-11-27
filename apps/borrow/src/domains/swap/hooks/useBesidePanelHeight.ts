import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * The height of the Swap mode panel while it stands beside the widget, or
 * `undefined` once the layout wraps and it sits below. `rowRef` is the row
 * holding the widget's column first and the panel last.
 */
export const useBesidePanelHeight = (
  rowRef: RefObject<HTMLElement | null>,
): number | undefined => {
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const row = rowRef.current;
    const column = row?.firstElementChild;
    const panel = row?.lastElementChild;

    // No ResizeObserver (jsdom): no cap, the widget's own heights.
    if (
      !row ||
      !column ||
      !panel ||
      column === panel ||
      typeof ResizeObserver === 'undefined'
    ) {
      return;
    }

    const update = () => {
      const panelBox = panel.getBoundingClientRect();
      const isBeside = panelBox.top < column.getBoundingClientRect().bottom;

      setHeight(isBeside ? Math.round(panelBox.height) : undefined);
    };

    const observer = new ResizeObserver(update);

    observer.observe(row);
    observer.observe(panel);

    return () => observer.disconnect();
  }, [rowRef]);

  return height;
};
