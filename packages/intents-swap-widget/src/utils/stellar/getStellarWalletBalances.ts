import { StellarNetworkPlugin } from '@/types/connectors';
import { StellarProvider } from '@/types/providers';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';

const STELLAR_NEP245_XLM =
  'nep245:v2_1.omni.hot.tg:1100_111bzQBB5v7AhLyPMDwS8uJgQV24KaAPXtwyVWu2KXbbfQU6NXRCz';

const STELLAR_NEP245_USDC =
  'nep245:v2_1.omni.hot.tg:1100_111bzQBB65GxAPAVoxqmMcgYo5oS3txhqs1Uh1cgahKQUeTUq1TJu';

// These are wallet (non-intent) balances, so they must be keyed the same way
// the rest of the widget reads them: by assetId + blockchain.
const getStellarBalanceKey = (assetId: string) =>
  getTokenBalanceKey({
    assetId,
    blockchain: 'stellar',
    isIntent: false,
  } as const);

export const getStellarWalletBalances = async (
  provider: StellarProvider,
  plugin: StellarNetworkPlugin,
) => {
  const { xlmStroops, usdcStroops } = await plugin.getNativeBalances(provider);

  return {
    [getStellarBalanceKey(STELLAR_NEP245_XLM)]: xlmStroops,
    [getStellarBalanceKey(STELLAR_NEP245_USDC)]: usdcStroops,
  };
};
