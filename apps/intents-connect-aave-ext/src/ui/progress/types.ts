import type {
  BalanceToken,
  ExecutionPreview,
  ExecutionStatus,
} from '@aurora-is-near/intents-connect';

import type { DeliverableOption } from '../supply/options';

/** What the user submitted, for the progress screen to describe. */
export type SupplyRun = {
  /** Unknown for a found run whose execution doesn't name it. */
  origin?: BalanceToken;
  option: DeliverableOption;
  /** The wallet the run belongs to (`ActiveWallet.key`). */
  walletKey: string;
  /**
   * Paid by a transfer to a deposit address (from an exchange or any
   * wallet), not by the wallet's own deposit.
   */
  transfer?: boolean;
  /** What was quoted: shown until the real execution reports its own. */
  quoted: ExecutionPreview['execution'];
  /**
   * Found in flight when the modal opened, rather than submitted here.
   * `waiting`: it still needs the user (`needs`), so it is only resumed when
   * they say so: resuming it would prompt the wallet.
   */
  resumed?: {
    id: string;
    status: ExecutionStatus;
    waiting: boolean;
    needs?: 'signature' | 'deposit';
  };
};
