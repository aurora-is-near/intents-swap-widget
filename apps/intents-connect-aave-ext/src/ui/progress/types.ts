import type {
  BalanceToken,
  ExecutionPreview,
} from '@aurora-is-near/intents-connect';

import type { DeliverableOption } from '../supply/options';

/** What the user submitted, for the progress screen to describe. */
export type SupplyRun = {
  origin: BalanceToken;
  option: DeliverableOption;
  /** The wallet the run belongs to (`ActiveWallet.key`). */
  walletKey: string;
  /** What was quoted: shown until the real execution reports its own. */
  quoted: ExecutionPreview['execution'];
};
