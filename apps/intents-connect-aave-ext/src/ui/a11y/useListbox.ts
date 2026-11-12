import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

type ListboxOption<T extends string> = {
  id: T;
  /** Matched by typeahead. */
  label: string;
  disabled?: boolean;
};

/** Typed characters within this long add up into one search. */
const TYPEAHEAD_MS = 500;

/**
 * A button that opens a list to pick one option from (the ARIA listbox
 * pattern, popup flavour), as prop getters for any look:
 * - the trigger says it opens a listbox, whether it's open, and what it
 *   controls; Down/Up open it too;
 * - opening focuses the selected option (else the first enabled); Up/Down
 *   move, Home/End jump, letters search, Enter/Space/click pick;
 * - picking or Escape closes it and focuses the trigger again. Escape is
 *   claimed (`preventDefault`), so a dialog around it stays open;
 * - Tab closes it and moves on; a press outside closes it.
 *
 * Render the options as `<li>` (not buttons) with `optionProps`, and mark
 * the selected one with more than colour (a check).
 */
export const useListbox = <T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly ListboxOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  /** The list's accessible name, e.g. "Reserve to supply". */
  label: string;
}) => {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<T>();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const list = useRef<HTMLElement | null>(null);
  const nodes = useRef(new Map<T, HTMLElement>());
  const typed = useRef({ text: '', at: 0 });

  const enabled = options.filter((option) => !option.disabled);

  const focusOption = (id: T | undefined) => {
    if (id !== undefined) {
      setActive(id);
      nodes.current.get(id)?.focus();
    }
  };

  const close = (refocus: boolean) => {
    setOpen(false);
    setActive(undefined);

    if (refocus) {
      trigger.current?.focus();
    }
  };

  const select = (id: T) => {
    onChange(id);
    close(true);
  };

  // Opening focuses the selected option, once the list is in the DOM.
  useLayoutEffect(() => {
    if (open) {
      focusOption(
        enabled.find((option) => option.id === value)?.id ?? enabled[0]?.id,
      );
    }
    // On opening only.
  }, [open]);

  // A press anywhere but the trigger or the list closes it.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event: PointerEvent) => {
      const path = event.composedPath();

      if (
        !(trigger.current && path.includes(trigger.current)) &&
        !(list.current && path.includes(list.current))
      ) {
        setOpen(false);
        setActive(undefined);
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);

    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const search = (key: string) => {
    const now = Date.now();
    const text =
      now - typed.current.at < TYPEAHEAD_MS ? typed.current.text + key : key;

    typed.current = { text, at: now };

    const start = enabled.findIndex((option) => option.id === active);
    const ordered = [
      ...enabled.slice(start + 1),
      ...enabled.slice(0, start + 1),
    ];

    const match = ordered.find((option) =>
      option.label.toLowerCase().startsWith(text.toLowerCase()),
    );

    focusOption(match?.id);
  };

  const onOptionKeyDown = (event: KeyboardEvent) => {
    const index = enabled.findIndex((option) => option.id === active);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusOption(enabled[Math.min(index + 1, enabled.length - 1)]?.id);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusOption(enabled[Math.max(index - 1, 0)]?.id);
        break;
      case 'Home':
        event.preventDefault();
        focusOption(enabled[0]?.id);
        break;
      case 'End':
        event.preventDefault();
        focusOption(enabled.at(-1)?.id);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();

        if (active !== undefined) {
          select(active);
        }

        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        // Focus moves on as usual (or the focus trap moves it); the list
        // just goes.
        close(false);
        break;
      default:
        if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          search(event.key);
        }
    }
  };

  const register = useCallback(
    (id: T) => (node: HTMLElement | null) => {
      if (node) {
        nodes.current.set(id, node);
      } else {
        nodes.current.delete(id);
      }
    },
    [],
  );

  return {
    open,
    setOpen,
    triggerProps: {
      ref: trigger,
      type: 'button' as const,
      'aria-haspopup': 'listbox' as const,
      'aria-expanded': open,
      'aria-controls': open ? listId : undefined,
      onClick: () => (open ? close(false) : setOpen(true)),
      onKeyDown: (event: KeyboardEvent) => {
        if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
          event.preventDefault();
          setOpen(true);
        } else if (open && event.key === 'Escape') {
          event.preventDefault();
          close(false);
        }
      },
    },
    listProps: {
      ref: (node: HTMLElement | null) => {
        list.current = node;
      },
      id: listId,
      role: 'listbox' as const,
      'aria-label': label,
    },
    optionProps: (option: ListboxOption<T>) => ({
      ref: register(option.id),
      role: 'option' as const,
      'aria-selected': option.id === value,
      'aria-disabled': option.disabled ? true : undefined,
      tabIndex: option.id === active ? 0 : -1,
      onClick: () => {
        if (!option.disabled) {
          select(option.id);
        }
      },
      onKeyDown: onOptionKeyDown,
    }),
  };
};
