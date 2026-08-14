import type { MultiPayload } from '@defuse-protocol/intents-sdk';

export type IntentSigningStandard =
  | 'nep413'
  | 'erc191'
  | 'raw_ed25519'
  | 'sep53';

export type Nep413IntentPayload = {
  message: string;
  nonce: string;
  recipient: string;
  callbackUrl?: string | null;
};

export type PreparedIntent =
  | { standard: 'nep413'; payload: Nep413IntentPayload }
  | { standard: 'erc191'; payload: string }
  | { standard: 'raw_ed25519'; payload: string }
  | { standard: 'sep53'; payload: string };

export type SignedIntent = Extract<
  MultiPayload,
  { standard: IntentSigningStandard }
>;

export type GenerateIntentRequest = {
  type: 'swap_transfer';
  standard: IntentSigningStandard;
  signerId: string;
  depositAddress: string;
};

export type GenerateIntentResponse = {
  intent: PreparedIntent;
  correlationId: string;
};

export type SubmitIntentRequest = {
  type: 'swap_transfer';
  signedData: SignedIntent;
};

export type SubmitIntentResponse = {
  intentHash: string;
  correlationId: string;
};

type SupportedChainName =
  | 'eth'
  | 'near'
  | 'base'
  | 'arbitrum'
  | 'bitcoin'
  | 'solana'
  | 'dogecoin'
  | 'turbochain'
  | 'tuxappchain'
  | 'vertex'
  | 'optima'
  | 'coineasy'
  | 'aurora'
  | 'xrpledger'
  | 'zcash'
  | 'gnosis'
  | 'berachain'
  | 'tron';

type SupportedBridge = 'direct' | 'poa' | 'aurora_engine';

interface FungibleTokenInfo {
  defuseAssetId: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
  chainName: SupportedChainName;
  bridge: SupportedBridge;
}

interface NativeTokenInfo {
  defuseAssetId: string;
  type: 'native';
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
  chainName: SupportedChainName;
  bridge: SupportedBridge;
  price?: number;
}

export type BaseTokenInfo = FungibleTokenInfo | NativeTokenInfo;
