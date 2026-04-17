import './tailwind.css'; // import so CSS is emitted in dist

export { TOKENS_DATA } from './constants/tokens';
export { WidgetConfigProvider, type WidgetConfigProviderProps } from './config';
export { DEFAULT_RPCS } from './rpcs';
export { CHAINS } from './chains';

export * from './icons';
export * from './components';
export * from './features';
export * from './hooks';
export * from './machine';
export * from './ext';
export * from './types';
export * from './errors';
export * from './widgets';

export { WidgetSwapSkeleton } from './widgets/WidgetSwap/WidgetSwapSkeleton';
export { WidgetWithdrawSkeleton } from './widgets/WidgetWithdraw/WidgetWithdrawSkeleton';
export { WidgetDepositSkeleton } from './widgets/WidgetDeposit/WidgetDepositSkeleton';

export { isBtcAddress } from './utils/chains/isBtcAddress';
export { isEvmAddress } from './utils/chains/isEvmAddress';
export { isCardanoAddress } from './utils/chains/isCardanoAddress';
export { isDogeAddress } from './utils/chains/isDogeAddress';
export { isTronAddress } from './utils/chains/isTronAddress';
export { isXrpAddress } from './utils/chains/isXrpAddress';
export { isNearAddress } from './utils/chains/isNearAddress';
export { isLtcAddress } from './utils/chains/isLtcAddress';
export { isStellarAddress } from './utils/chains/isStellarAddress';
export { isSuiAddress } from './utils/chains/isSuiAddress';
export { isSolanaAddress } from './utils/chains/isSolanaAddress';
export { isTonAddress } from './utils/chains/isTonAddress';
export { isZecAddress } from './utils/chains/isZecAddress';
