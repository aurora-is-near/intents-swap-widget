import type { WalletConnector } from '@aurora-is-near/intents-connect';
import type { ChainWalletConnector } from '@aurora-is-near/intents-connect-wallet/connect';
import type { ComponentType } from 'react';

/** What a family's connector chunk reports to `WalletSessionProvider`. */
export type ConnectorReport = {
  connector: ChainWalletConnector;
  /** With its deposit transfer; `null` while the family is not connected. */
  wallet: WalletConnector | null;
  /** AppKit only: the namespace its connection is on. */
  family?: 'evm' | 'sol' | null;
};

export type ConnectorProps = {
  onChange: (report: ConnectorReport) => void;
};

/** Each connector chunk exports its component as `Connector`. */
export type ConnectorModule = {
  Connector: ComponentType<ConnectorProps>;
};
