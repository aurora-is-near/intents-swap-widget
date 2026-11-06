import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type Politeness = 'polite' | 'assertive';

type Announce = (message: string, politeness?: Politeness) => void;

const AnnounceContext = createContext<Announce>(() => undefined);

/** Long enough for screen readers to see the region empty first. */
const CLEAR_MS = 50;

/**
 * Screen-reader announcements for everything inside: two live regions
 * (polite and assertive), visually hidden, present from the start (a
 * region added along with its message often isn't read). Put it inside the
 * dialog: regions outside an `aria-modal` dialog may be ignored.
 */
export const Announcer = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState({ polite: '', assertive: '' });
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;

    return () => pending.forEach(clearTimeout);
  }, []);

  const announce = useCallback<Announce>((message, politeness = 'polite') => {
    // Emptied first, then set: the same message twice is read twice.
    setMessages((current) => ({ ...current, [politeness]: '' }));

    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setMessages((current) => ({ ...current, [politeness]: message }));
    }, CLEAR_MS);

    timers.current.add(timer);
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {messages.polite}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {messages.assertive}
      </div>
    </AnnounceContext.Provider>
  );
};

/**
 * `announce(message, politeness)`: read `message` to screen-reader users
 * without moving focus. Polite waits for a pause; assertive (errors only)
 * interrupts. Outside an `Announcer`, it does nothing.
 */
export const useAnnounce = () => useContext(AnnounceContext);
