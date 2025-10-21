import { Chains, DefaultChainsFilter } from './chain';
import { Token } from './token';

/**
 * Configuration object for the Swap Widget.
 */
export type WidgetConfig = {
  // ────────────────────────────────
  // Application metadata
  // ────────────────────────────────

  /**
   * Display name of the embedding application.
   * @example 'Calyx'
   */
  appName: string;

  /**
   * URL to the application icon.
   */
  appIcon: string;

  // ────────────────────────────────
  // Connected wallet
  // ────────────────────────────────

  /**
   * Wallet type used for user intent signing.
   *
   * 'evm' = MetaMask / Rainbow / WalletConnect
   * 'near' = NEAR Wallet / MyNearWallet
   * 'sol' = Phantom / Solflare
   */
  intentsAccountType: 'evm' | 'near' | 'sol';

  /**
   * The chains supported by the connected wallet.
   */
  walletSupportedChains: ReadonlyArray<Chains>;

  /**
   * Currently connected wallet address (optional).
   * Used to pre-fill balances or display connected state.
   */
  walletAddress?: string | null;

  // ────────────────────────────────
  // Quotes & Transfers
  // ────────────────────────────────

  /**
   * Default maximum slippage tolerance (e.g. 0.01 = 1%).
   */
  defaultMaxSlippage: number;

  /**
   * If true, automatically switches target tokens to match available liquidity.
   */
  enableAutoTokensSwitching?: boolean;

  // ────────────────────────────────
  // 🪙 Tokens filtering
  // ────────────────────────────────

  /**
   * Whether to show "intent tokens" (internal, platform-specific assets).
   */
  showIntentTokens: boolean;

  /**
   * Explicit list of allowed token asset IDs.
   * If set, the widget will only display tokens from this list.
   */
  allowedTokensList?: string[];

  /** Allowed source token asset IDs. */
  allowedSourceTokensList?: string[];

  /** Allowed target token asset IDs. */
  allowedTargetTokensList?: string[];

  /**
   * Predicate to filter tokens dynamically.
   * Called for every token before display.
   */
  filterTokens: (token: Token) => boolean;

  // ────────────────────────────────
  // Chains filtering
  // ────────────────────────────────

  /**
   * Order in which chains appear in dropdowns and selectors.
   */
  chainsOrder: Chains[];

  /** List of allowed chains (global). */
  allowedChainsList?: Chains[];

  /** Allowed source chains. */
  allowedSourceChainsList?: Chains[];

  /** Allowed target chains. */
  allowedTargetChainsList?: Chains[];

  /**
   * Defines chain filtering logic for source and target chains.
   *
   * - `external`: filter applied to wallet or external assets
   * - `intents`: filter applied to intent-based chains
   */
  chainsFilter: {
    source: DefaultChainsFilter;
    target: DefaultChainsFilter;
  };

  // ────────────────────────────────
  // 🌐 1Click API
  // ────────────────────────────────

  /**
   * URL of any 1Click quote proxy endpoint.
   *
   * By default we will use the public 1Click quote URL. For the case where you
   * want to apply your own quote logic you can provide your own proxy URL here.
   *
   * @example
   * https://my.1click-proxy.com/quote
   */
  oneClickApiQuoteProxyUrl: string;
};
