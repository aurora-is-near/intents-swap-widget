import type { FinalExecutionOutcome } from '@near-js/types';

export interface NearSignMessageParams {
  message: string;
  recipient: string;
  nonce: Uint8Array;
}

export interface NearSignedMessage {
  accountId: string;
  publicKey: string;
  signature: string;
}

export interface FunctionCallAction {
  type: 'FunctionCall';
  params: {
    methodName: string;
    args: Record<string, unknown>;
    gas: string;
    deposit: string;
  };
}

export interface TransferAction {
  type: 'Transfer';
  params: {
    deposit: string;
  };
}

export type NearAction = FunctionCallAction | TransferAction;

export interface NearTransaction {
  signerId?: string;
  receiverId: string;
  actions: Array<NearAction>;
}

export interface NearSignAndSendTransactionsParams {
  transactions: Array<NearTransaction>;
}

export interface NearWalletBase {
  signMessage(params: NearSignMessageParams): Promise<NearSignedMessage>;
  signAndSendTransactions(
    params: NearSignAndSendTransactionsParams,
  ): Promise<Array<FinalExecutionOutcome>>;
}
