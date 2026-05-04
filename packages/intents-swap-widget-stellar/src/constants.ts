import { Asset } from '@stellar/stellar-sdk';

export const RPC_ENDPOINTS = [
  'https://sorobanrpc.stellar.org',
  'https://rpc.ankr.com/stellar_soroban',
  'https://stellar-soroban-public.nodies.app',
];

export const USDC_ASSET = new Asset(
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
);
