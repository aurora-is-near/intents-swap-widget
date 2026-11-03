export * from '@/types';

export { createIntentsConnectApi } from '@/api';
export type {
  CreateExecutionBody,
  CreateStepsExecutionBody,
  ExecutionMetadata,
  FetchLike,
  IntentsConnectApi,
  IntentsConnectApiOptions,
  ListExecutionsQuery,
  RecordDepositBody,
  SubmitSignatureBody,
  SupportedToken,
  SupportedTokensFlow,
  SupportedTokensResult,
} from '@/api';

export { createIntentsApi, DEFAULT_INTENTS_API_URL } from '@/intentsApi';
export type {
  AuthenticateResult,
  ConfidentialBalance,
  GenerateIntentRequest,
  GenerateIntentResult,
  GetConfidentialBalancesResult,
  GetIntentsAccountBalancesResult,
  GetTokensResult,
  IntentsAccountBalance,
  IntentsApi,
  IntentsApiAssetStat,
  IntentsApiOptions,
  IntentsApiToken,
  IntentsRail,
  PreparedIntent,
  PreparedIntentStandard,
  RefreshAccessTokenResult,
  SignedIntent,
  SubmitIntentRequest,
  SubmitIntentResult,
  SwapDetails,
  SwapQuote,
  SwapQuoteRequest,
  SwapQuoteResponse,
  SwapStatus,
  SwapStatusResult,
  UserTokenOptions,
} from '@/intentsApi';

export {
  buildIntentPayload,
  buildNep413Message,
  createTimestampedNonceBytes,
  decodeNonce,
  encodeNonce,
  getCurrentSalt,
  getProofSignerId,
  INTENTS_CONTRACT,
  invalidateSalt,
  OWNERSHIP_PROOF_TTL_MS,
  OwnershipError,
  signOwnershipProof,
  verifyOwnership,
  type DecodedNonce,
  type OwnershipErrorCode,
  type OwnershipProof,
  type OwnershipRejection,
  type OwnershipStandard,
  type OwnershipVerdict,
  type SignOwnershipProofOptions,
} from '@/ownership';

export {
  assertPreparedIntent,
  assertSwapTransferPayload,
  buildFundingQuoteRequest,
  createFundingStore,
  DEFAULT_FUNDING_DEADLINE_MS,
  DEFAULT_FUNDING_SLIPPAGE_BPS,
  FUNDING_RAIL,
  FUNDING_STORAGE_KEY_PREFIX,
  FundingError,
  fundIntermediaryFromIntents,
  getActiveFunding,
  getIntermediaryBalance,
  quoteFunding,
  requireSignableStandard,
  resumeFunding,
  signAndSubmitFunding,
  signPreparedIntent,
  TERMINAL_FUNDING_STAGES,
  watchFunding,
  type FundIntermediaryOptions,
  type FundingErrorCode,
  type FundingErrorMeta,
  type FundingEvent,
  type FundingPhase,
  type FundingRecord,
  type FundingRecordStage,
  type FundingRequest,
  type FundingSource,
  type FundingStore,
  type FundingStoreState,
  type GetIntermediaryBalanceArgs,
  type SignableIntentStandard,
  type SignPreparedIntentOptions,
  type SwapTransferExpectation,
} from '@/funding';

export {
  createIntentsSession,
  SESSION_STORAGE_KEY_PREFIX,
  SessionError,
  type CreateIntentsSessionOptions,
  type IntentsSession,
  type IntentsSessionState,
  type IntentsSessionStatus,
  type SessionErrorCode,
} from '@/session';

export {
  createVerificationStore,
  VERIFIED_WALLETS_STORAGE_KEY,
  verifyWallet,
  type VerificationState,
  type VerificationStore,
  type VerifyWalletResult,
} from '@/verification';

export {
  ALCHEMY_NETWORKS,
  BalanceRpcError,
  DEFAULT_RPCS,
  getBalanceFamily,
  getBalanceSource,
  getTokens,
  getWalletBalances,
  isAlchemyChain,
  isNativeToken,
  NATIVE_NEAR_ASSET_ID,
  normalizeTokens,
  readEvmTokenBalance,
  resolveRpcs,
  type BalanceSource,
  type BalanceToken,
  type BalanceTransportOptions,
  type ChainRpcUrls,
  type GetWalletBalancesArgs,
  type WalletBalances,
} from '@/balances';

export {
  createResource,
  createResourceCache,
  type Resource,
  type ResourceCache,
  type ResourceState,
  type ResourceStatus,
} from '@/resource';

export {
  getLocalStorage,
  memoryStorage,
  webStorage,
  type KeyValueStorage,
} from '@/storage';

export {
  getFamilyForStandard,
  getIntentsAccountId,
  getWalletIntentsAccountId,
  type IntentsAccountFamily,
} from '@/account';

export {
  DEFAULT_NEAR_RPC_URLS,
  NearContractError,
  NearRpcError,
  NearUnknownAccountError,
  balanceRpcUrls,
  getNativeNearBalance,
  nearRpc,
  proofRpcUrls,
  viewCall,
  type NearRpcOptions,
} from '@/near';

export {
  createExecutionRunner,
  isOutOperationExecution,
  isStepsOnlyExecution,
} from '@/runner';
export type {
  ExecutionPlan,
  ExecutionPreview,
  ExecutionRunner,
  ExecutionRunnerOptions,
  OriginToken,
  OutOperationPlan,
  ResumeDepositOptions,
  RunnerEvent,
  StepsPlan,
  StepsPreview,
} from '@/runner';

export {
  IN_FLIGHT_PHASES,
  PHASE_TRANSITIONS,
  TERMINAL_PHASES,
  createExecutionMachine,
  createInitialContext,
  guards,
  isInFlightPhase,
  isTerminalPhase,
  moveTo,
  type Context,
  type ExecutionMachine,
  type Phase,
} from '@/machine';

export {
  signIntentsConnectPayload,
  signIntentsConnectText,
  standards,
  type SignPayloadArgs,
  type SignTextArgs,
} from '@/signers';

export {
  EVM_CHAIN_IDS,
  EVM_CHAINS,
  getChainFamily,
  isEvmChain,
  parseOriginAsset,
  type ChainFamily,
} from '@/chains';

export { deriveExecutionRecovery, type ExecutionRecovery } from '@/recovery';

export {
  DepositTransferError,
  ExecutionCancelledError,
  ExecutionPollTimeoutError,
  GuardError,
  IntentsApiError,
  IntentsConnectApiError,
  IntentsConnectError,
  RunnerDisposedError,
  failGuard,
  isUserRejection,
  toError,
  type GuardCode,
  type GuardMeta,
} from '@/errors';

export { defaultLogger, noopLogger, type Logger } from '@/logger';
