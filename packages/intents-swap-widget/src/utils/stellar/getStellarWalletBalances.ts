import { StellarNetworkPlugin } from '@/types/connectors';
import { StellarProvider } from '@/types/providers';

const STELLAR_NEP245_XLM =
  'nep245:v2_1.omni.hot.tg:1100_111bzQBB5v7AhLyPMDwS8uJgQV24KaAPXtwyVWu2KXbbfQU6NXRCz';

const STELLAR_NEP245_USDC =
  'nep245:v2_1.omni.hot.tg:1100_111bzQBB65GxAPAVoxqmMcgYo5oS3txhqs1Uh1cgahKQUeTUq1TJu';

export const getStellarWalletBalances = async (
  provider: StellarProvider,
  plugin: StellarNetworkPlugin,
) => {
  const { xlmStroops, usdcStroops } = await plugin.getNativeBalances(provider);

  return {
    [STELLAR_NEP245_XLM]: xlmStroops,
    [STELLAR_NEP245_USDC]: usdcStroops,
  };
};
