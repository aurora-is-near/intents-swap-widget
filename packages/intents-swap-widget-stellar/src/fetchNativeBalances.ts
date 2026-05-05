import { StrKey, xdr } from '@stellar/stellar-sdk';
import axios from 'axios';

import { RPC_ENDPOINTS, USDC_ASSET } from './constants';

export const fetchNativeBalances = async (publicKey: string) => {
  const accountPubKey = xdr.PublicKey.publicKeyTypeEd25519(
    StrKey.decodeEd25519PublicKey(publicKey),
  );

  const accountKeyXdr = xdr.LedgerKey.account(
    new xdr.LedgerKeyAccount({ accountId: accountPubKey }),
  ).toXDR('base64');

  const trustlineKeyXdr = xdr.LedgerKey.trustline(
    new xdr.LedgerKeyTrustLine({
      accountId: accountPubKey,
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
      // eslint-disable-next-line no-await-in-loop
      const response = await axios.post<{
        result: { entries: { xdr: string }[] };
      }>(baseURL, requestPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 3000,
      });

      const entries = response.data?.result?.entries;

      if (!entries || entries.length === 0) {
        continue;
      }

      let xlmStroops = '0';
      let usdcStroops = '0';

      entries.forEach((entry) => {
        if (!entry.xdr) {
          return;
        }

        const entryData = xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64');

        if (entryData.switch().name === 'account') {
          xlmStroops = entryData.account().balance().toString();
        }

        if (entryData.switch().name === 'trustline') {
          usdcStroops = entryData.trustLine().balance().toString();
        }
      });

      return { xlmStroops, usdcStroops };
    } catch {
      continue;
    }
  }

  return { xlmStroops: '0', usdcStroops: '0' };
};
