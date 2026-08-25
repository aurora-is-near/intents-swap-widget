import type { Recipe, Step } from '@aurora-is-near/intents-connect';

import * as constants from '.';

export type MintParams = { tickLower: string; tickUpper: string };

const NPM = '0xC63E9672f8e93234C73cE954a1d1292e4103Ab86';
const WETH = '0x4200000000000000000000000000000000000006';
const CBETH = '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22';
const ZERO = '0x0000000000000000000000000000000000000000';
const MINT_SIG =
  'mint((address,address,address,int24,int24,uint256,uint256,uint256,uint256,address,uint256))';

export const POOL = '0xB1383DC47D9971Fc999C3A9088F79E744b376e97'; // cbETH/WETH, live

export const hydrexMintRecipe: Recipe<MintParams> = {
  id: 'hydrex-manual-mint',
  intent: 'hydrex_manual_mint',
  title: 'Hydrex cbETH/WETH position',
  flow: 'bridge-in',
  type: 'evm',
  destination: { chain: 'base', assetId: constants.DEST_ASSET }, // native ⇒ token guard exempt
  buildSteps: ({ userAddress, amount }, { tickLower, tickUpper }): Step[] => [
    {
      to: WETH,
      functionSignature: 'deposit()',
      parameters: [],
      value: amount,
    },
    {
      to: WETH,
      functionSignature: 'approve(address,uint256)',
      parameters: [NPM, amount],
      value: '0',
    },
    {
      to: NPM,
      functionSignature: MINT_SIG,
      parameters: [
        [
          CBETH,
          WETH,
          ZERO,
          tickLower,
          tickUpper,
          '0',
          amount,
          '0',
          '0', // WETH (token1) side only, no slippage mins (demo)
          userAddress,
          String(Math.floor(Date.now() / 1000) + 24 * 3600),
        ],
      ],
      value: '0',
    },
  ],
};
