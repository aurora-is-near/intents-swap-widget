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
