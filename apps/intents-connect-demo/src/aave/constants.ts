import type { Recipe, Step } from '@aurora-is-near/intents-connect';

import type { DestinationToken } from '../shared/config';

export const MONAD_RPC = 'https://rpc.monad.xyz';

// Aave V3 Monad mainnet, verified against the official address book:
// https://github.com/bgd-labs/aave-address-book/blob/main/src/ts/AaveV3Monad.ts
export const POOL = '0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef';
export const DATA_PROVIDER = '0xB65A68B98274ef7D9a60E0C0747dD1BEc3D32fad';
export const USDC = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603';

// Native USDC from the 1Click catalogue (https://1click.chaindefuser.com/v0/tokens).
// Monad uses HOT's nep245 identifiers, not the nep141 scheme used on Base.
export const DEST_ASSET =
  'nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx';
export const DEST_TOKEN: DestinationToken = { symbol: 'USDC', decimals: 6 };

export const aaveSupplyRecipe: Recipe = {
  id: 'aave-monad-supply',
  intent: 'aave_monad_supply',
  title: 'Supply USDC to Aave on Monad',
  flow: 'bridge-in',
  type: 'evm',
  destination: { chain: 'monad', assetId: DEST_ASSET, tokenAddress: USDC },
  buildSteps: ({ userAddress, amount }): Step[] => [
    {
      to: USDC,
      functionSignature: 'approve(address,uint256)',
      parameters: [POOL, amount],
      value: '0',
    },
    {
      to: POOL,
      functionSignature: 'supply(address,uint256,address,uint16)',
      // The bridge intermediary pays, but the wallet must own the aTokens.
      // Keep amount opaque: it can be the SDK's {MIN_AMOUNT_OUT} placeholder.
      parameters: [USDC, amount, userAddress, '0'],
      value: '0',
    },
  ],
};
