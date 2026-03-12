import { Asset, StrKey, xdr } from '@stellar/stellar-sdk';

import { createNetworkClient } from '@/network';
import { WidgetError } from '@/errors';

const RPC_ENDPOINTS = [
  'https://sorobanrpc.stellar.org',
  'https://rpc.ankr.com/stellar_soroban',
  'https://stellar-soroban-public.nodies.app',
];

const createRpcClient = (baseURL: string) =>
  createNetworkClient({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

const USDC_ASSET = new Asset(
  'USDC',
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
);

export const getStellarWalletBalances = async (publicKey: string) => {
  // 1. XLM: Account ledger key
  const accountPubKey = xdr.PublicKey.publicKeyTypeEd25519(
    StrKey.decodeEd25519PublicKey(publicKey),
  );

  const accountKeyXdr = xdr.LedgerKey.account(
    new xdr.LedgerKeyAccount({ accountId: accountPubKey }),
  ).toXDR('base64');

  // 2. USDC: Trustline ledger key
  const trustlinePubKey = xdr.PublicKey.publicKeyTypeEd25519(
    StrKey.decodeEd25519PublicKey(publicKey),
  );

  const trustlineKeyXdr = xdr.LedgerKey.trustline(
    new xdr.LedgerKeyTrustLine({
      accountId: trustlinePubKey,
      asset: USDC_ASSET.toTrustLineXDRObject(),
    }),
  ).toXDR('base64');

  const requestPayload = {
    id: 1,
    jsonrpc: '2.0',
    method: 'getLedgerEntries',
    params: { keys: [accountKeyXdr, trustlineKeyXdr] },
  };

  // eslint-disable-next-line no-restricted-syntax
  for (const baseURL of RPC_ENDPOINTS) {
    try {
      const client = createRpcClient(baseURL);
      // eslint-disable-next-line no-await-in-loop
      const response = await client.post<{
        result: { entries: { xdr: string }[] };
      }>('/', requestPayload, {
        timeout: 3000,
      });

      if (
        !response.data?.result?.entries ||
        response.data.result.entries.length === 0
      ) {
        throw new WidgetError('Stellar: No entries found in response');
      }

      if (response.data?.result?.entries) {
        let xlmStroops = '0';
        let usdcStroops = '0';

        response.data.result.entries.forEach((entry: { xdr: string }) => {
          if (!entry.xdr) {
            throw new WidgetError('Stellar: No xdr found in entry');
          }

          const entryData = xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64');

          if (entryData.switch().name === 'account') {
            xlmStroops = entryData.account().balance().toString();
          }

          if (entryData.switch().name === 'trustline') {
            usdcStroops = entryData.trustLine().balance().toString();
          }
        });

        return {
          'nep245:v2_1.omni.hot.tg:1100_111bzQBB5v7AhLyPMDwS8uJgQV24KaAPXtwyVWu2KXbbfQU6NXRCz':
            xlmStroops,
          'nep245:v2_1.omni.hot.tg:1100_111bzQBB65GxAPAVoxqmMcgYo5oS3txhqs1Uh1cgahKQUeTUq1TJu':
            usdcStroops,
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-continue
      continue;
    }
  }

  return {
    'nep245:v2_1.omni.hot.tg:1100_111bzQBB5v7AhLyPMDwS8uJgQV24KaAPXtwyVWu2KXbbfQU6NXRCz':
      '0',
    'nep245:v2_1.omni.hot.tg:1100_111bzQBB65GxAPAVoxqmMcgYo5oS3txhqs1Uh1cgahKQUeTUq1TJu':
      '0',
  };
};
