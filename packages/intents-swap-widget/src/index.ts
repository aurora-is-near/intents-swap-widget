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

export { isValidChainAddress } from './utils/checkers/isValidChainAddress';
