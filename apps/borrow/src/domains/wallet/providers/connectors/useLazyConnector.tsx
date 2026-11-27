import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChainWalletConnector } from '@aurora-is-near/intents-connect-wallet/connect';
import type { ComponentType, ReactElement } from 'react';

import type { ConnectorModule, ConnectorProps, ConnectorReport } from './types';

type Waiter = {
  resolve: (report: ConnectorReport) => void;
  reject: (error: unknown) => void;
};

type LazyConnectorOptions = {
  /** The connector id the modal row selects. */
  id: string;
  load: () => Promise<ConnectorModule>;
  /** Loads after the first render; otherwise on the first `connect()`. */
  eager: boolean;
  /** For the console error when the chunk fails to load. */
  name: string;
};

export type LazyConnector = {
  /** The reported connector, or a stand-in until the chunk reports in. */
  connector: ChainWalletConnector;
  report: ConnectorReport | undefined;
  /** The chunk failed to load; the family is left out of the modal. */
  failed: boolean;
  /** Renders the loaded chunk; `null` until then. */
  element: ReactElement | null;
};

/**
 * One wallet family in its own chunk. Until the chunk has reported in, a
 * stand-in connector with the family's id takes its place: disconnected, and
 * its `connect()` loads the chunk, waits for the real connector and connects
 * that. A failed load is reported once and leaves the other families working.
 */
export const useLazyConnector = ({
  id,
  load,
  eager,
  name,
}: LazyConnectorOptions): LazyConnector => {
  const [wanted, setWanted] = useState(eager);
  const [Connector, setConnector] = useState<ComponentType<ConnectorProps>>();
  const [report, setReport] = useState<ConnectorReport>();
  const [failed, setFailed] = useState(false);
  const waitersRef = useRef<Waiter[]>([]);
  const reportRef = useRef(report);
  const failureRef = useRef<{ error: unknown } | undefined>(undefined);

  reportRef.current = report;

  useEffect(() => {
    if (!wanted) {
      return undefined;
    }

    let mounted = true;

    load().then(
      (module) => {
        if (mounted) {
          setConnector(() => module.Connector);
        }
      },
      (error: unknown) => {
        // A configuration-level failure (a missing chunk after a deploy, a
        // blocked request), reported once like the API key check.
        console.error(
          `[Borrow] ${name} wallets did not load; the others still work.`,
          error,
        );
        failureRef.current = { error };
        waitersRef.current.splice(0).forEach((waiter) => waiter.reject(error));

        if (mounted) {
          setFailed(true);
        }
      },
    );

    return () => {
      mounted = false;
    };
  }, [wanted, load, name]);

  useEffect(() => {
    if (report) {
      waitersRef.current.splice(0).forEach((waiter) => waiter.resolve(report));
    }
  }, [report]);

  const standIn = useMemo<ChainWalletConnector>(
    () => ({
      id,
      isConnected: false,
      address: undefined,
      connect: async () => {
        const ready =
          reportRef.current ??
          (await new Promise<ConnectorReport>((resolve, reject) => {
            if (failureRef.current) {
              reject(failureRef.current.error);

              return;
            }

            waitersRef.current.push({ resolve, reject });
            setWanted(true);
          }));

        await ready.connector.connect();
      },
      disconnect: () => {},
    }),
    [id],
  );

  return {
    connector: report?.connector ?? standIn,
    report,
    failed,
    element: Connector ? <Connector onChange={setReport} /> : null,
  };
};
