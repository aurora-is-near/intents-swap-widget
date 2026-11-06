import {
  type KeyboardEvent,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
} from 'react';

/**
 * The ARIA tabs pattern, as prop getters for any look:
 * - a `tablist` with a name; one Tab stop (the selected tab, roving
 *   tabindex);
 * - Left/Right move and select (automatic activation), Home/End go to the
 *   ends, wrapping;
 * - each tab names and controls its panel, rendered with `panelProps`.
 *
 * Only the selected panel needs to exist: a tab points at its panel only
 * while selected. `focusOnMount` focuses the selected tab when it mounts,
 * for a switch that remounts along with what it switches.
 */
export const useTabs = <T extends string>({
  items,
  value,
  onChange,
  focusOnMount = false,
}: {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  focusOnMount?: boolean;
}) => {
  const base = useId();
  const tabs = useRef(new Map<T, HTMLElement>());
  const tabId = (id: T) => `${base}tab-${id}`;
  const panelId = (id: T) => `${base}panel-${id}`;

  useLayoutEffect(() => {
    if (focusOnMount) {
      tabs.current.get(value)?.focus();
    }
    // Mount only.
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    const index = items.indexOf(value);
    const last = items.length - 1;
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];

    if (target === undefined) {
      return;
    }

    event.preventDefault();

    const next = items[target]!;

    onChange(next);
    tabs.current.get(next)?.focus();
  };

  const register = useCallback(
    (id: T) => (node: HTMLElement | null) => {
      if (node) {
        tabs.current.set(id, node);
      } else {
        tabs.current.delete(id);
      }
    },
    [],
  );

  return {
    listProps: (label: string) => ({
      role: 'tablist' as const,
      'aria-label': label,
      onKeyDown,
    }),
    tabProps: (id: T) => ({
      ref: register(id),
      id: tabId(id),
      role: 'tab' as const,
      type: 'button' as const,
      'aria-selected': id === value,
      'aria-controls': id === value ? panelId(id) : undefined,
      tabIndex: id === value ? 0 : -1,
      onClick: () => onChange(id),
    }),
    panelProps: (id: T) => ({
      id: panelId(id),
      role: 'tabpanel' as const,
      'aria-labelledby': tabId(id),
    }),
  };
};
