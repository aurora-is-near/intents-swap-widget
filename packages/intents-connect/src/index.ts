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
  GetConfidentialBalancesResult,
  GetIntentsAccountBalancesResult,
  GetTokensResult,
  IntentsAccountBalance,
  IntentsApi,
  IntentsApiAssetStat,
  IntentsApiOptions,
  IntentsApiToken,
  RefreshAccessTokenResult,
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

export { createExecutionRunner } from '@/runner';
export type {
  ExecutionPlan,
  ExecutionPreview,
  ExecutionRunner,
  ExecutionRunnerOptions,
  OriginToken,
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
