/* eslint-disable no-console */
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Cell } from '@ton/core';
import * as Icons from 'lucide-react';
import {
  Blockchain,
  GaslessSettlement,
  Omniston,
  Quote as OmnistonQuote,
  SettlementMethod,
} from '@ston-fi/omniston-sdk';
import {
  GetExecutionStatusResponse,
  Quote as OneClickQuote,
  QuoteRequest as OneClickQuoteRequest,
  OneClickService,
  OpenAPI,
} from '@defuse-protocol/one-click-sdk-typescript';
import { useMemo, useRef, useState } from 'react';
import { useAppKitProvider } from '@reown/appkit/react';
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react';
import {
  Button,
  Chains,
  MakeTransferArgs,
  SimpleToken,
  SuccessScreen,
  SwapCard,
  useMakeEvmTransfer,
  WidgetConfig,
  WidgetConfigProvider,
  WidgetContainer,
  WidgetSwap,
} from '@aurora-is-near/intents-swap-widget';
import { formatBigToHuman } from '@aurora-is-near/intents-swap-widget/utils';
import clsx from 'clsx';
import { useAppKitWallet } from './hooks/useAppKitWallet';
import { useTonWallet } from './hooks/useTonWallet';
import { WalletConnectionCard } from './components/WalletConnectionCard';
import { Heading } from './components/Heading';

// Client-side Alchemy API key - safe to expose in frontend code
// This key is rate-limited and domain-restricted by Alchemy
const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';

type SwapType = 'oneclick' | 'omniston';

type SwapStatus = 'not-started' | 'in-progress' | 'completed' | 'failed';

type SwapStatusMap = Record<SwapType, SwapStatus>;

type SwapDetails = {
  status: SwapStatus;
  source: {
    assetId: string;
    amount: string;
  };
  target: {
    assetId: string;
    amount: string;
  };
  swapType: SwapType;
  swapButtonText: string;
};

const DEFAULT_SWAP_STATUS_MAP: SwapStatusMap = {
  omniston: 'not-started',
  oneclick: 'not-started',
};

const TON_ASSET_ID = 'nep245:v2_1.omni.hot.tg:1117_';
const TON_ASSET_ADDRESS = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
const TARGET_ASSET_ADDRESSES = [
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
  'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO',
  'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  'EQBX6K9aXVl3nXINCyPPL86C4ONVmQ8vK360u6dykFKXpHCa',
];

const TARGET_ASSET_BLACKLISTED_ADDRESSES = [
  'EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA',
  'EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k',
  'EQA1R_LuQCLHlMgOo1S4G7Y7W1cd0FrAkbA10Zq7rddKxi9k',
  'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  'EQDc_nrm5oOVCVQM8GRJ5q_hr1jgpNQjsGkIGE-uztt26_Ep',
  'EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav',
  'EQDPdq8xjAhytYqfGSX8KcFWIReCufsB9Wdg0pLlYSO_h76w',
  'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
  'EQD-cvR0Nz6XAyRBvbhz-abTrRC6sI5tvHvvpeQraV9UAAD7',
  'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO',
  'EQCAj5oiRRrXokYsg_B-e0KG9xMwh5upr5I8HQzErm0_BLUM',
  'EQBKMfjX_a_dsOLm-juxyVZytFP7_KKnzGv6J01kGc72gVBp',
  'EQAjl-ne1M3Mq2qYIT-jRzjFLE7S0VR7qnMgpU6VjsPSrDIX',
  'EQBYnUrIlwBrWqp_rl-VxeSBvTR2VmTfC4ManQ657n_BUILD',
  'EQCuPm01HldiduQ55xaBF_1kaW_WAUy5DHey8suqzU_MAJOR',
  'EQBsosmcZrD6FHijA7qWGLw5wo_aH8UN435hi935jJ_STORM',
  'EQD0laik0FgHV8aNfRhebi8GDG2rpDyKGXem0MBfya_Ew1-8',
  'EQBE_gBrU3mPI9hHjlJoR_kYyrhQgyCFD6EUWfa42W8T7EBP',
  'EQA1R_LuQCLHlMgOo1S4G7Y7W1cd0FrAkbA10Zq7rddKxi9k',
  'EQB4zZusHsbU2vVTPqjhlokIOoiZhEdCMT703CWEzhTOo__X',
  'EQB2ONl9nfzoGfeRFhvKTLX28MOD_nvT8cfI41-FylvNvvHm',
  'EQAQXlWJvGbbFfE8F3oS8s87lIgdovS455IsWFaRdmJetTon',
  'EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE',
  'EQDwpFzHxJm7ekUcmjcvfoCa_XikggHbn8wlpuAheiRfSSm8',
  'EQAIb6KmdfdDR7CN1GBqVJuP25iCnLKCvBlJ07Evuu2dzP5f',
  'EQDQ5UUyPHrLcQJlPAczd_fjxn8SLrlNQwolBznxCdSlfQwr',
  'EQAJ8uWd7EBqsmpSWaRdf_I-8R8-XHwh3gsNKhy-UrdrPcUo',
  'EQCRWpQQmfSglpLp6D5Xebix50AStBxjfQQNkssFP_IsiQc3',
  'EQBIzvHeNGl1CCALgCa_iC-OiK_4lFhs_TBKtRNjP6fi0024',
  'EQAVfEY2iKSpEkUhgFLFWAgHeSz2NH2XV-MvDuiKF5plSbsU',
  'EQDQEUr0LPi8m6D6F0Wrvuok7tZbAcr0yn2Y7hK291MMzMjM',
  'EQC47093oX5Xhb0xuk2lCr2RhS8rj-vul61u4W2UH5ORmG_O',
  'EQBhKT4-OaSZaxBBcvDE4u8s3L1v8u_6cHxSJQWcztld6AFt',
  'EQB420yQsZobGcy0VYDfSKHpG2QQlw-j1f_tPu1J488I__PX',
  'EQD4P32U10snNoIavoq6cYPTQR82ewAjO20epigrWRAup54_',
  'EQCWDj49HFInSwSk49eAo476E1YBywLoFuSZ6OO3x7jmP2jn',
  'EQAQfNrwhA5sEywrLTtsxpyQFeKRfEpLdZREZILP9z9iUjAH',
  'EQDNDv54v_TEU5t26rFykylsdPQsv5nsSZaH_v7JSJPtMitv',
  'EQACLXDwit01stiqK9FvYiJo15luVzfD5zU8uwDSq6JXxbP8',
  'EQAQZEf6A-BfN8wYVnjdyPWpCXwkTSjhfF5ZWP7AjReM4eEI',
  'EQCdb8hvMDDZcqpPGH-cCj3iMuom9P57mMyrdoHNNyXHM9Fs',
  'EQCFVNlRb-NHHDQfv3Q9xvDXBLJlay855_xREsq5ZDX6KN-w',
  'EQCJbp0kBpPwPoBG-U5C-cWfP_jnksvotGfArPF50Q9Qiv9h',
  'EQCN2dkvaosVjpa9XozzN0wm1MBcI2GTN71CWvRzIsSH7IRH',
  'EQBX6K9aXVl3nXINCyPPL86C4ONVmQ8vK360u6dykFKXpHCa',
  'EQAEuikLQVh2lDMrV99nTHqFL_TXEyCEJ1xKMuPT60tfvdps',
  'EQBtcL4JA-PdPiUkB8utHcqdaftmUSTqdL8Z1EeXePLti_nK',
  'EQAj680BapntDEm6parX4BfX_S1Jcb1qpF63BREiHZYBGENE',
  'EQDCb2loMIB8YS53GEo2r2ggS9AW1Dz-zX_as4DtxXV1u8XY',
  'EQCl0S4xvoeGeFGijTzicSA8j6GiiugmJW5zxQbZTUntre-1',
  'EQCbKMTmEAdSnzsK85LOpaDkDH3HjujEbTePMSeirvEaNq-U',
  'EQBv2cEJ-T-1GNRdzaY_JYoJvpAISuFHOKmJZPQnoUqEHTlU',
  'EQCQZpelevHNsbw5IUtwSa4Cs8kqWww0KsYeDri9kwS18eCz',
  'EQCBdxpECfEPH2wUxi1a6QiOkSf-5qDjUWqLCUuKtD-GLINT',
  'EQBxo4huVJXaf1ZOdwnnDdxa9OVoyNGhXMsJVzobmxSWITCH',
  'EQDu9ijk44grAHe3Dy9qYOy-hic-vJr4d1CH3HNyN-gT5LyL',
  'EQAZwJdXCZoO9JIbwBTL2a_zzOAPheLICa4YG7lNIlDZzMmx',
];

const SLIPPAGE_TOLERANCE = 500; // 5%
const REFETCH_QUOTE_INTERVAL = 10_000; // 10 seconds

OpenAPI.BASE = 'https://1click.chaindefuser.com';

const omniston = new Omniston({
  apiUrl: 'wss://omni-ws.ston.fi',
});

const sleep = async (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Fetch the details of the given assets from the STON.fi API.
 */
const fetchStonFiAssets = async ({
  condition,
  unconditionalAssets,
  strict,
}: {
  unconditionalAssets: string[];
  condition?: string;
  strict?: boolean;
}): Promise<SimpleToken[]> => {
  const body = {
    unconditional_assets: unconditionalAssets,
  };

  if (condition) {
    Object.assign(body, { condition });
  }

  const res = await fetch('https://api.ston.fi/v1/assets/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    asset_list: {
      contract_address: string;
      kind: string;
      dex_price_usd: string;
      meta: {
        symbol: string;
        display_name: string;
        image_url: string;
        decimals: number;
      };
    }[];
  };

  const assetList = strict
    ? data.asset_list.filter((asset) =>
        unconditionalAssets.includes(asset.contract_address),
      )
    : data.asset_list;

  return assetList.map((asset) => ({
    symbol: asset.meta.symbol,
    price: parseFloat(asset.dex_price_usd),
    blockchain: 'ton',
    assetId: asset.contract_address,
    decimals: asset.meta.decimals,
    contractAddress: asset.contract_address,
    icon: asset.meta.image_url,
  }));
};

/**
 * Fetch the available target tokens.
 */
const fetchTargetTokens: WidgetConfig['fetchTargetTokens'] = async () => {
  const assets = await fetchStonFiAssets({
    unconditionalAssets: TARGET_ASSET_ADDRESSES,
    condition:
      '(asset:essential | asset:popular | asset:liquidity:medium | asset:liquidity:high | asset:liquidity:very_high | asset:wallet_has_balance) & !(asset:blacklisted | asset:deprecated)',
  });

  return assets.filter(
    ({ assetId }) => !TARGET_ASSET_BLACKLISTED_ADDRESSES.includes(assetId),
  );
};

/**
 * Fetch the TON transaction hash for the given trace ID.
 *
 * Retries up to 5 times if the trace is not found as it sometimes takes a few
 * seconds for the TonAPI to index the transaction.
 */
const fetchTonTransactionHash = async (traceId: string, attempt = 0) => {
  const res = await fetch(`https://tonapi.io/v2/traces/${traceId}`);
  const data = await res.json();

  if (res.status === 404) {
    if (attempt < 5) {
      await sleep(3000);

      return fetchTonTransactionHash(traceId, attempt + 1);
    }

    return null;
  }

  if (data.error) {
    throw new Error(`Failed to fetch Omniston transaction: ${data.error}`);
  }

  const txHash: string = data.transaction.hash;

  return txHash;
};

const performOmnistoneSwap = async (
  omnistonQuote: OmnistonQuote,
  tonAddress: string,
  tonConnect: ReturnType<typeof useTonConnectUI>[0],
) => {
  if (!omnistonQuote) {
    throw new Error('Missing Omniston quote');
  }

  const tx = await omniston.buildTransfer({
    quote: omnistonQuote,
    useRecommendedSlippage: true,
    sourceAddress: {
      blockchain: Blockchain.TON,
      address: tonAddress,
    },
    destinationAddress: {
      blockchain: Blockchain.TON,
      address: tonAddress,
    },
  });

  const messages = tx.ton?.messages ?? [];

  const sendTxRes = await tonConnect.sendTransaction({
    validUntil: Date.now() + 1000000,
    messages: messages.map((message) => ({
      address: message.targetAddress,
      amount: message.sendAmount,
      payload: message.payload,
    })),
  });

  // Wait for a short time to give the TonAPI a chance to index the transaction
  await sleep(3000);

  const externalTxHash = Cell.fromBase64(sendTxRes.boc).hash().toString('hex');

  const txHash = await fetchTonTransactionHash(externalTxHash);

  if (!txHash) {
    throw new Error('Failed to fetch Omniston transaction hash');
  }

  return txHash;
};

/**
 * Wait for the Omniston transfer to be settled.
 */
const waitForOmnistonSettlement = (
  quoteId: string,
  outgoingTxHash: string,
  tonAddress: string,
) => {
  const tradeStatus = omniston.trackTrade({
    quoteId,
    traderWalletAddress: {
      blockchain: Blockchain.TON,
      address: tonAddress,
    },
    outgoingTxHash,
  });

  return new Promise((resolve) => {
    const { unsubscribe } = tradeStatus.subscribe(({ status }) => {
      if (status?.tradeSettled) {
        unsubscribe();
        resolve(null);
      }
    });
  });
};

/**
 * Wait for the OneClick transfer to be settled.
 */
const waitForOneClickSettlement = async (
  oneClickDepositAddress: string,
): Promise<GetExecutionStatusResponse> => {
  const res = await OneClickService.getExecutionStatus(oneClickDepositAddress);

  if (res.status === GetExecutionStatusResponse.status.SUCCESS) {
    return res;
  }

  if (res.status === GetExecutionStatusResponse.status.FAILED) {
    throw new Error('OneClick transfer failed');
  }

  await sleep(3000);

  return waitForOneClickSettlement(oneClickDepositAddress);
};

const getOneClickSwapDetails = ({
  sourceAsset,
  sourceAmount,
  targetAmount,
  status,
}: {
  sourceAsset: string;
  sourceAmount: string;
  targetAmount: string;
  status: SwapStatus;
}): SwapDetails => {
  return {
    status,
    source: {
      assetId: sourceAsset,
      amount: sourceAmount,
    },
    target: {
      assetId: TON_ASSET_ID,
      amount: targetAmount,
    },
    swapType: 'oneclick',
    swapButtonText: 'Confirm in source wallet',
  };
};

const getOmnistonSwapDetails = ({
  sourceAmount,
  targetAmount,
  destinationAsset,
  status,
}: {
  destinationAsset: string;
  sourceAmount: string;
  targetAmount: string;
  status: SwapStatus;
}): SwapDetails => {
  return {
    status,
    source: {
      assetId: TON_ASSET_ID,
      amount: sourceAmount,
    },
    target: {
      assetId: destinationAsset,
      amount: targetAmount,
    },
    swapType: 'omniston',
    swapButtonText: 'Confirm in TON wallet',
  };
};

const findTokenByAssetId = (
  tokens: SimpleToken[],
  assetId: string,
): SimpleToken => {
  const token = tokens.find((t) => t.assetId === assetId);

  if (!token) {
    throw new Error(`Token not found for assetId: ${assetId}`);
  }

  return token;
};

export const Page = () => {
  const {
    address: appKitWalletAddress,
    chainType,
    isConnecting: isAppKitConnecting,
  } = useAppKitWallet();

  const { address: tonAddress, isConnecting: isTonConnecting } = useTonWallet();
  const [tonConnect] = useTonConnectUI();
  const omnistonQuote = useRef<OmnistonQuote>(null);
  const oneClickQuote = useRef<OneClickQuote>(null);
  const swapStatus = useRef<SwapStatusMap>(DEFAULT_SWAP_STATUS_MAP);

  const { walletProvider: solanaProvider } =
    useAppKitProvider<SolanaProvider>('solana');

  const { make: makeEvmTransfer } = useMakeEvmTransfer();
  const [isTokensModalOpen, setIsTokensModalOpen] = useState(false);
  const [makeTransferArgs, setMakeTransferArgs] =
    useState<MakeTransferArgs | null>(null);

  const [swaps, setSwaps] = useState<SwapDetails[]>([]);

  const [successfulTransactionDetails, setSuccessfulTransactionDetails] =
    useState<{
      hash: string;
      transactionLink: string;
    } | null>();

  const updateSwapStatus = (swapType: SwapType, status: SwapStatus) => {
    setSwaps((prev): SwapDetails[] => {
      if (!prev) {
        return prev;
      }

      const swap = prev.find((s) => s.swapType === swapType);

      if (!swap) {
        throw new Error(`Invalid swap type: ${swapType}`);
      }

      swap.status = status;

      const newSwaps = [...prev];

      swapStatus.current = {
        omniston:
          newSwaps.find((s) => s.swapType === 'omniston')?.status ??
          'not-started',
        oneclick:
          newSwaps.find((s) => s.swapType === 'oneclick')?.status ??
          'not-started',
      };

      return newSwaps;
    });
  };

  const resetSwapState = () => {
    setSuccessfulTransactionDetails(null);
    setMakeTransferArgs(null);
    setSwaps([]);
    swapStatus.current = DEFAULT_SWAP_STATUS_MAP;
  };

  const makeSolanaTransfer = async (args: MakeTransferArgs) => {
    if (!solanaProvider?.publicKey) {
      throw new Error('No Solana wallet connected');
    }

    const { Connection, PublicKey, SystemProgram, Transaction } = await import(
      '@solana/web3.js'
    );

    const connection = new Connection(
      `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    );

    const fromPubkey = solanaProvider.publicKey;
    const toPubkey = new PublicKey(args.address);

    if (!args.tokenAddress) {
      // Validate amount
      const lamports = BigInt(args.amount);

      if (lamports <= 0n) {
        throw new Error('Transfer amount must be positive');
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        }),
      );

      const { blockhash } = await connection.getLatestBlockhash();

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const signedTx = await solanaProvider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3,
        },
      );

      // Don't wait for confirmation - just return the signature
      // The 1Click API will handle monitoring the transaction
      return { hash: signature };
    }

    const { getAssociatedTokenAddress, createTransferInstruction } =
      await import('@solana/spl-token');

    // Validate amount
    const tokenAmount = BigInt(args.amount);

    if (tokenAmount <= 0n) {
      throw new Error('Transfer amount must be positive');
    }

    const mintPubkey = new PublicKey(args.tokenAddress);
    const fromTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      fromPubkey,
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      toPubkey,
    );

    const transaction = new Transaction().add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPubkey,
        tokenAmount,
      ),
    );

    const { blockhash } = await connection.getLatestBlockhash();

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    const signedTx = await solanaProvider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      {
        skipPreflight: false,
        maxRetries: 3,
      },
    );

    // Don't wait for confirmation - just return the signature
    // The 1Click API will handle monitoring the transaction
    return { hash: signature };
  };

  const confirmOneClickSwap = async (args: MakeTransferArgs) => {
    updateSwapStatus('oneclick', 'in-progress');

    try {
      if (args.chain === 'sol') {
        await makeSolanaTransfer(args);
      } else {
        await makeEvmTransfer(args);
      }

      await waitForOneClickSettlement(args.address);
    } catch (error) {
      updateSwapStatus('oneclick', 'failed');
      console.error('One Click swap failed:', error);

      return;
    }

    updateSwapStatus('oneclick', 'completed');
  };

  const confirmOmnistonSwap = async () => {
    if (!omnistonQuote.current) {
      throw new Error('Missing Omniston quote');
    }

    updateSwapStatus('omniston', 'in-progress');

    let omnistonTxHash: string;

    try {
      omnistonTxHash = await performOmnistoneSwap(
        omnistonQuote.current,
        tonAddress,
        tonConnect,
      );

      await waitForOmnistonSettlement(
        omnistonQuote.current.quoteId,
        omnistonTxHash,
        tonAddress,
      );
    } catch (error) {
      updateSwapStatus('omniston', 'failed');
      console.error('Omniston swap failed:', error);

      return;
    }

    updateSwapStatus('omniston', 'completed');
    setSuccessfulTransactionDetails({
      hash: omnistonTxHash,
      transactionLink: `https://tonviewer.com/transaction/${omnistonTxHash}`,
    });
  };

  const fetchOmnistonQuote = async (
    destinationAsset: string,
    bidAmount: string,
    isRefetch?: boolean,
  ) => {
    // If this is a refetch and a swap is already in progress, return the
    // existing quote
    if (
      isRefetch &&
      omnistonQuote.current &&
      swapStatus.current.omniston !== 'not-started'
    ) {
      return omnistonQuote.current;
    }

    omnistonQuote.current = await new Promise<OmnistonQuote>((resolve) => {
      const rfq = omniston.requestForQuote({
        settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
        askAssetAddress: {
          blockchain: Blockchain.TON,
          address: destinationAsset,
        },
        bidAssetAddress: {
          blockchain: Blockchain.TON,
          address: TON_ASSET_ADDRESS,
        },
        amount: {
          bidUnits: bidAmount,
        },
        settlementParams: {
          gaslessSettlement: GaslessSettlement.GASLESS_SETTLEMENT_POSSIBLE,
          maxPriceSlippageBps: SLIPPAGE_TOLERANCE,
        },
      });

      const { unsubscribe } = rfq.subscribe((quoteResponseEvent) => {
        if (
          quoteResponseEvent.type === 'quoteUpdated' &&
          'quote' in quoteResponseEvent
        ) {
          unsubscribe();
          resolve(quoteResponseEvent.quote);

          return;
        }
      });
    });

    return omnistonQuote.current;
  };

  const fetchOneClickQuote = async (
    data: OneClickQuoteRequest,
    isRefetch?: boolean,
  ) => {
    // If this is a refetch and a swap is already in progress, return the
    // existing quote
    if (
      isRefetch &&
      oneClickQuote.current &&
      swapStatus.current.oneclick !== 'not-started'
    ) {
      return oneClickQuote.current;
    }

    const res = await OneClickService.getQuote({
      ...data,
      destinationAsset: TON_ASSET_ID,
      slippageTolerance: SLIPPAGE_TOLERANCE,
      appFees: [
        {
          recipient: 'calyx_widget_fees.near',
          fee: 25, // 0.25%
        },
      ],
    });

    oneClickQuote.current = res.quote;

    return res.quote;
  };

  /**
   * Fetch a two-step quote.
   *
   * The first quote is done via OneClick, from the selected source asset to TON.
   * The second quote is done via Omniston, from TON to the selected target asset.
   */
  const fetchDoubleQuote: WidgetConfig['fetchQuote'] = async (
    data,
    { isRefetch },
  ) => {
    const [
      {
        deadline,
        depositAddress,
        timeEstimate,
        amountIn,
        amountInFormatted,
        amountInUsd,
        minAmountIn,
        amountOut,
      },
      tokens,
    ] = await Promise.all([
      fetchOneClickQuote(data, isRefetch),
      fetchStonFiAssets({
        unconditionalAssets: [data.destinationAsset],
        strict: true,
      }),
    ]);

    // Request the second quote, to see how much of the target asset we can get
    // for the TON we received from OneClick. The quote is stored for later use
    // when performing the swap.
    const { askUnits, params } = await fetchOmnistonQuote(
      data.destinationAsset,
      amountOut,
      isRefetch,
    );

    const targetToken = findTokenByAssetId(tokens, data.destinationAsset);

    const minAskAmount = params?.swap?.minAskAmount ?? askUnits;
    const amountOutHuman = parseFloat(
      formatBigToHuman(askUnits, targetToken.decimals),
    );

    const amountOutUsd = amountOutHuman * targetToken.price;

    const quoteResponse = {
      deadline,
      depositAddress,
      timeEstimate,
      amountIn,
      amountInFormatted,
      amountInUsd,
      minAmountIn,
      amountOut: askUnits,
      amountOutFormatted: String(amountOutHuman),
      amountOutUsd: String(amountOutUsd),
      minAmountOut: minAskAmount,
    };

    setSwaps([
      getOneClickSwapDetails({
        status: swapStatus.current.oneclick,
        sourceAsset: data.originAsset,
        sourceAmount: quoteResponse.amountIn,
        targetAmount: amountOut,
      }),
      getOmnistonSwapDetails({
        status: swapStatus.current.omniston,
        destinationAsset: data.destinationAsset,
        sourceAmount: amountOut,
        targetAmount: quoteResponse.amountOut,
      }),
    ]);

    return quoteResponse;
  };

  /**
   * Fetch a TON-only quote.
   */
  const fetchTonOnlyQuote: WidgetConfig['fetchQuote'] = async (
    data,
    { isRefetch },
  ) => {
    const [{ bidUnits, askUnits, params, quoteTimestamp }, tokens] =
      await Promise.all([
        fetchOmnistonQuote(data.destinationAsset, data.amount, isRefetch),
        fetchStonFiAssets({
          unconditionalAssets: [data.destinationAsset, TON_ASSET_ADDRESS],
          strict: true,
        }),
      ]);

    const sourceToken = findTokenByAssetId(tokens, TON_ASSET_ADDRESS);
    const targetToken = findTokenByAssetId(tokens, data.destinationAsset);

    const minAskAmount = params?.swap?.minAskAmount ?? askUnits;
    const amountOutHuman = parseFloat(
      formatBigToHuman(askUnits, targetToken.decimals),
    );

    const amountOutUsd = amountOutHuman * targetToken.price;

    const amountInHuman = parseFloat(
      formatBigToHuman(bidUnits, sourceToken.decimals),
    );

    const amountInUsd = amountInHuman * sourceToken.price;

    const quoteResponse = {
      depositAddress: data.recipient,
      timeEstimate: quoteTimestamp,
      amountIn: bidUnits,
      amountInFormatted: String(amountInHuman),
      amountInUsd: String(amountInUsd),
      minAmountIn: bidUnits,
      amountOut: askUnits,
      amountOutFormatted: String(amountOutHuman),
      amountOutUsd: String(amountOutUsd),
      minAmountOut: minAskAmount,
    };

    setSwaps([
      getOmnistonSwapDetails({
        status: swapStatus.current.omniston,
        destinationAsset: data.destinationAsset,
        sourceAmount: bidUnits,
        targetAmount: askUnits,
      }),
    ]);

    return quoteResponse;
  };

  /**
   * Fetch a quote.
   *
   * If we are swapping from TON to one of the target memecoins we only need a
   * single quote via Omniston. Otherwise, we need to do a two-step quote via
   * OneClick and then Omniston.
   */
  const fetchQuote: WidgetConfig['fetchQuote'] = (data, options) => {
    if (data.originAsset === TON_ASSET_ID) {
      return fetchTonOnlyQuote(data, options);
    }

    return fetchDoubleQuote(data, options);
  };

  const makeTransfer = (args: MakeTransferArgs) => {
    setMakeTransferArgs(args);
  };

  const walletSupportedChains = useMemo(() => {
    const chains: Chains[] = ['ton'];

    if (chainType === 'evm') {
      chains.push('eth', 'arb', 'pol', 'bsc', 'op', 'avax', 'base');
    }

    if (chainType === 'solana') {
      chains.push('sol');
    }

    // Default to 'near' if no wallets connected
    if (chains.length === 0) {
      chains.push('near');
    }

    return chains;
  }, [chainType]);

  const intentsAccountType = useMemo(() => {
    if (chainType === 'evm') {
      return 'evm';
    }

    if (chainType === 'solana') {
      return 'sol';
    }

    return 'near';
  }, [chainType]);

  const isSwapInProgress = !!swaps.find(
    (swap) => swap.status === 'in-progress',
  );

  if (successfulTransactionDetails) {
    return (
      <WidgetContainer
        isFullPage
        HeaderComponent={
          <div className="flex flex-row items-center mb-1">
            <div className="bg-sw-success-100 text-sw-gray-975 flex h-[40px] w-[40px] items-center justify-center rounded-full">
              <Icons.Check size={24} />
            </div>
            <Heading className="ml-4">All done</Heading>
          </div>
        }
        FooterComponent={
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              resetSwapState();
            }}>
            Go back
          </Button>
        }>
        <SuccessScreen
          hideHeader
          hash={successfulTransactionDetails.hash}
          transactionLink={successfulTransactionDetails.transactionLink}
          message="Your swap has been successfully completed, and the funds are now available in TON wallet."
        />
      </WidgetContainer>
    );
  }

  const nextSwap = swaps.find((swap) => swap.status !== 'completed');
  const showConfirmSwaps = nextSwap && makeTransferArgs;

  return (
    <WidgetConfigProvider
      config={{
        appName: 'Ton Intents',
        allowedTargetChainsList: ['ton'],
        hideSendAddress: true,
        connectedWallets: {
          default: appKitWalletAddress,
          ton: tonAddress,
        },
        sendAddress: tonAddress,
        walletSupportedChains,
        intentsAccountType,
        fetchQuote,
        fetchTargetTokens,
        refetchQuoteInterval: REFETCH_QUOTE_INTERVAL,
        alchemyApiKey: ALCHEMY_API_KEY,
        tonCenterApiKey:
          '90bffeaa9a8ba0248d8bd642a7321e1d46b3a5ae11510f0e61da5cdc44d83eba',
        chainsFilter: {
          target: { intents: 'none', external: 'all' },
          source: {
            intents: 'none',
            external: appKitWalletAddress ? 'wallet-supported' : 'all',
          },
        },
      }}
      localisation={{
        'submit.active.external.swap': 'Swap now',
      }}
      theme={{
        colorScheme: 'dark',
        backgroundColor: '#1E2337',
        primaryColor: '#0098EA',
      }}>
      {showConfirmSwaps && (
        <WidgetContainer
          isFullPage
          className="z-10"
          HeaderComponent={
            <div className="flex flex-row items-center mb-1">
              <button
                type="button"
                className="bg-sw-gray-900 text-sw-gray-100 flex h-[40px] w-[40px] items-center justify-center rounded-full cursor-pointer"
                onClick={() => {
                  resetSwapState();
                }}>
                <Icons.ArrowLeft size={20} />
              </button>
              <Heading className="ml-4">Confirm swaps</Heading>
            </div>
          }
          FooterComponent={
            <Button
              variant="primary"
              size="lg"
              state={isSwapInProgress ? 'loading' : 'default'}
              onClick={() => {
                if (nextSwap.swapType === 'oneclick') {
                  void confirmOneClickSwap(makeTransferArgs);

                  return;
                }

                void confirmOmnistonSwap();
              }}>
              {nextSwap.swapButtonText}
            </Button>
          }>
          {swaps.map((swap, index) => (
            <SwapCard
              key={index}
              state={swap.status}
              title={
                swaps.length > 1 ? `Swap ${index + 1}/${swaps.length}` : 'Swap'
              }
              className={clsx(index > 0 && 'mt-2.5', {
                'opacity-50':
                  index > 0 && swaps[index - 1]?.status !== 'completed',
              })}
              source={swap.source}
              target={swap.target}
            />
          ))}
        </WidgetContainer>
      )}
      <WidgetSwap
        className={showConfirmSwaps ? 'hidden' : undefined}
        isOneWay
        isFullPage
        isLoading={isAppKitConnecting || isTonConnecting}
        makeTransfer={makeTransfer}
        onMsg={(msg) => {
          if (msg.type === 'on_tokens_modal_toggled') {
            setIsTokensModalOpen(msg.isOpen);
          }
        }}
        HeaderComponent={
          isTokensModalOpen ? undefined : (
            <>
              <Heading className="mb-3 sm:mb-8">
                Swap to TON from anywhere
              </Heading>
              <WalletConnectionCard />
            </>
          )
        }
        FooterComponent={
          <div className="inline-flex items-center gap-1 rounded-full text-sm font-medium py-1.5 px-3 bg-sw-gray-900 text-sw-gray-100 mt-3 sm:mt-6">
            Powered by
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10 3.96351C10.6038 3.96351 11.1464 4.29892 11.4164 4.83878L15.8695 13.7449C16.1166 14.2392 16.0907 14.815 15.8004 15.2854C15.5097 15.7558 15.0062 16.0365 14.4535 16.0365H5.5469C4.99425 16.0365 4.49072 15.7558 4.20002 15.2854C3.90932 14.815 3.88337 14.2392 4.13054 13.7449L8.58365 4.83878C8.85358 4.29892 9.39624 3.96351 10 3.96351ZM10 2.875C8.98775 2.875 8.06295 3.44681 7.61013 4.35203L3.15702 13.2581C2.74294 14.0863 2.78726 15.0702 3.27402 15.8576C3.76078 16.6454 4.6209 17.125 5.5469 17.125H14.4531C15.3791 17.125 16.2392 16.6454 16.726 15.8576C17.2127 15.0698 17.2571 14.0863 16.843 13.2581L12.3899 4.35203C11.9375 3.44681 11.0123 2.875 10 2.875Z"
                fill="#EBEDF5"
                stroke="#EBEDF5"
                strokeWidth="0.5"
              />
            </svg>
            <span className="text-sw-gray-50">Aurora Labs</span>
          </div>
        }
      />
    </WidgetConfigProvider>
  );
};
