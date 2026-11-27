import { useCallback, useEffect, useRef, useState } from 'react';

type Pending = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

type Outcome = { ok: true } | { ok: false; error: unknown };

/**
 * Turns the connect modal into one promise: `connect()` opens it and
 * resolves once `isConnected` turns true (at once when it already is).
 * It rejects when the modal closes without a pick (`close`), when the
 * picked wallet refuses (`select` rejects), or when the wallet's own modal
 * settles without a connection: near-connect, say, before it has loaded.
 * Calls while the modal is open share the same promise.
 */
export const useConnectRequest = ({
  isConnected,
  select,
}: {
  isConnected: boolean;
  /** Connects the picked family; the wallet package's `useWalletSelector.select`. */
  select: (id: string) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  // Counts picks whose wallet settled, so the check below runs after the
  // connection's own state updates have rendered.
  const [settledPicks, setSettledPicks] = useState(0);
  const pendingRef = useRef<Pending | undefined>(undefined);
  const connectedRef = useRef(isConnected);
  const selectRef = useRef(select);

  connectedRef.current = isConnected;
  selectRef.current = select;

  const settle = useCallback((outcome: Outcome) => {
    const pending = pendingRef.current;

    pendingRef.current = undefined;

    if (outcome.ok) {
      pending?.resolve();
    } else {
      pending?.reject(outcome.error);
    }
  }, []);

  const cancel = useCallback(
    () =>
      settle({
        ok: false,
        error: new Error('Wallet connection was cancelled'),
      }),
    [settle],
  );

  useEffect(() => {
    if (isConnected) {
      settle({ ok: true });
    }
  }, [isConnected, settle]);

  useEffect(() => {
    if (settledPicks > 0 && !connectedRef.current) {
      cancel();
    }
  }, [settledPicks, cancel]);

  const connect = useCallback((): Promise<void> => {
    if (connectedRef.current) {
      return Promise.resolve();
    }

    if (!pendingRef.current) {
      let resolve: () => void = () => {};
      let reject: (error: unknown) => void = () => {};
      const promise = new Promise<void>((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
      });

      pendingRef.current = { promise, resolve, reject };
    }

    setOpen(true);

    return pendingRef.current.promise;
  }, []);

  const pick = useCallback(
    (id: string) => {
      setOpen(false);
      selectRef.current(id).then(
        () => setSettledPicks((count) => count + 1),
        (error: unknown) => settle({ ok: false, error }),
      );
    },
    [settle],
  );

  const close = useCallback(() => {
    setOpen(false);
    cancel();
  }, [cancel]);

  return { open, connect, pick, close };
};
