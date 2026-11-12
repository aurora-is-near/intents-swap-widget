import { type ReactNode, type RefObject, useRef } from 'react';

import { Announcer } from './Announcer';
import { useFocusTrap } from './useFocusTrap';
import { useModalPage } from './useModalPage';

/**
 * A modal dialog that works inside a shadow root:
 * - the page behind is inert and doesn't scroll (useModalPage);
 * - focus starts on `initialFocus`, stays inside, falls back to
 *   `fallbackFocus` (e.g. the title, `tabIndex={-1}`) when its element goes,
 *   and returns to the opener, or `returnFocus()`, on close (useFocusTrap);
 * - Escape calls `onEscape` (else `onClose`), unless something inside
 *   claimed the key first with `event.preventDefault()` (an open list, a
 *   search field clearing);
 * - a mouse-down on the backdrop closes it;
 * - announcements (`useAnnounce`) are read from inside it.
 *
 * Mount it to open it, unmount it to close it.
 */
export const Dialog = ({
  onClose,
  onEscape,
  labelledBy,
  describedBy,
  initialFocus,
  fallbackFocus,
  returnFocus,
  className,
  children,
}: {
  onClose: () => void;
  /** What Escape does, when it isn't closing (e.g. going back a level). */
  onEscape?: () => void;
  /** The id of the title. */
  labelledBy: string;
  /** The id of a short description, read after the title. */
  describedBy?: string;
  initialFocus?: RefObject<HTMLElement | null>;
  fallbackFocus?: RefObject<HTMLElement | null>;
  returnFocus?: () => HTMLElement | null | undefined;
  /** The dialog box's own classes. */
  className?: string;
  children: ReactNode;
}) => {
  const dialog = useRef<HTMLDivElement>(null);

  // First, so its cleanup (the page back from inert) runs before focus
  // returns to an opener on the page.
  useModalPage(true, dialog);
  useFocusTrap(dialog, {
    active: true,
    initialFocus,
    fallbackFocus,
    returnFocus,
  });

  return (
    // The backdrop's mouse-down closes, like Escape (its keyboard way).
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Escape is its keyboard equivalent
    <div
      className="fixed inset-0 flex items-center justify-center bg-overlay p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}>
      {/* Escape belongs to the dialog itself (the APG dialog pattern). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above */}
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        lang="en"
        tabIndex={-1}
        className={className}
        onKeyDown={(event) => {
          if (
            event.key === 'Escape' &&
            !event.nativeEvent.defaultPrevented &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            (onEscape ?? onClose)();
          }
        }}>
        <Announcer>{children}</Announcer>
      </div>
    </div>
  );
};
