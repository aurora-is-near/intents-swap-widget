import { useCallback, useId, useLayoutEffect, useRef } from 'react';

/**
 * A disclosure (a group that expands and collapses), as prop getters: the
 * trigger says whether it's open and what it controls; the panel, while
 * closed, is `inert`, so its contents leave the Tab order and the
 * accessibility tree while a height animation can still play. Put the
 * trigger in a heading when the group is a section.
 *
 * `inert` is set on the element directly: React 18 doesn't know the
 * attribute.
 */
export const useDisclosure = (open: boolean) => {
  const panelId = useId();
  const panel = useRef<HTMLElement | null>(null);
  const isOpen = useRef(open);

  isOpen.current = open;

  useLayoutEffect(() => {
    panel.current?.toggleAttribute('inert', !open);
  }, [open]);

  // A panel mounting later takes the current state; changes are the
  // effect's.
  const panelRef = useCallback((node: HTMLElement | null) => {
    panel.current = node;
    node?.toggleAttribute('inert', !isOpen.current);
  }, []);

  return {
    triggerProps: {
      'aria-expanded': open,
      'aria-controls': panelId,
    },
    panelProps: { id: panelId, ref: panelRef },
  };
};
