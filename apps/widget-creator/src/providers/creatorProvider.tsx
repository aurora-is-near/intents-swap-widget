import React, { createContext, useReducer } from 'react';
import type { ReactNode } from 'react';

type CreatorState = {
  // Configure - User authentication
  userAuthMode: 'standalone' | 'dapp';
  // Configure - Account abstraction
  accountAbstractionMode: 'enabled' | 'disabled';
  // Configure - Networks
  selectedNetworks: string[];
  // Configure - Tokens
  selectedTokenSymbols: string[];
  enableSellToken: boolean;
  autoSelectTopBalanceToken: boolean;
  defaultSellToken: { tokenSymbol: string; chain?: string };
  enableBuyToken: boolean;
  defaultBuyToken: { tokenSymbol: string; chain?: string };
  // Configure - Fee collection
  enableCustomFees: boolean;
  feePercentage: string;
  collectorAddress: string;
  // Design - Mode
  allowToggleModes: boolean;
  defaultMode: 'auto' | 'dark' | 'light';
  // Design - Style
  stylePreset: 'clean' | 'bold';
  cornerRadius: 'none' | 's' | 'm' | 'l';
  showContainerWrapper: boolean;
  // Design - Colors
  primaryColor: string;
  surfaceColor: string;
  backgroundColor: string;
  successColor: string;
  warningColor: string;
  alertColor: string;
};

const initialState: CreatorState = {
  userAuthMode: 'standalone',
  accountAbstractionMode: 'enabled',
  selectedNetworks: [],
  selectedTokenSymbols: [],
  enableSellToken: true,
  autoSelectTopBalanceToken: false,
  defaultSellToken: { tokenSymbol: 'USDT', chain: 'near' },
  enableBuyToken: false,
  defaultBuyToken: { tokenSymbol: 'USDT', chain: 'eth' },
  enableCustomFees: false,
  feePercentage: '1',
  collectorAddress: '0x92c21eB298128FDE1b7f8A9332910A614DC7df0A',
  // Design
  allowToggleModes: false,
  defaultMode: 'dark',
  stylePreset: 'clean',
  cornerRadius: 'm',
  showContainerWrapper: false,
  primaryColor: '#D5B7FF',
  surfaceColor: '#2A2C33',
  backgroundColor: '#24262D',
  successColor: '#98FFB5',
  warningColor: '#FADFAD',
  alertColor: '#FFB8BE',
};

type Action =
  // Configure - User authentication
  | { type: 'SET_USER_AUTH_MODE'; payload: 'standalone' | 'dapp' }
  // Configure - Account abstraction
  | { type: 'SET_ACCOUNT_ABSTRACTION_MODE'; payload: 'enabled' | 'disabled' }
  // Configure - Networks
  | { type: 'SET_SELECTED_NETWORKS'; payload: string[] }
  // Configure - Tokens
  | { type: 'SET_SELECTED_TOKEN_SYMBOLS'; payload: string[] }
  | { type: 'SET_ENABLE_SELL_TOKEN'; payload: boolean }
  | { type: 'SET_AUTO_SELECT_TOP_BALANCE_TOKEN'; payload: boolean }
  | {
      type: 'SET_DEFAULT_SELL_TOKEN';
      payload: { tokenSymbol: string; chain?: string };
    }
  | { type: 'SET_ENABLE_BUY_TOKEN'; payload: boolean }
  | {
      type: 'SET_DEFAULT_BUY_TOKEN';
      payload: { tokenSymbol: string; chain?: string };
    }
  // Configure - Fee collection
  | { type: 'SET_ENABLE_CUSTOM_FEES'; payload: boolean }
  | { type: 'SET_FEE_PERCENTAGE'; payload: string }
  | { type: 'SET_COLLECTOR_ADDRESS'; payload: string }
  // Design - Mode
  | { type: 'SET_ALLOW_TOGGLE_MODES'; payload: boolean }
  | { type: 'SET_DEFAULT_MODE'; payload: 'auto' | 'dark' | 'light' }
  // Design - Style
  | { type: 'SET_STYLE_PRESET'; payload: 'clean' | 'bold' }
  | { type: 'SET_CORNER_RADIUS'; payload: 'none' | 's' | 'm' | 'l' }
  | { type: 'SET_SHOW_CONTAINER_WRAPPER'; payload: boolean }
  // Design - Colors
  | { type: 'SET_PRIMARY_COLOR'; payload: string }
  | { type: 'SET_SURFACE_COLOR'; payload: string }
  | { type: 'SET_BACKGROUND_COLOR'; payload: string }
  | { type: 'SET_SUCCESS_COLOR'; payload: string }
  | { type: 'SET_WARNING_COLOR'; payload: string }
  | { type: 'SET_ALERT_COLOR'; payload: string }
  // Reset
  | { type: 'RESET_ALL' }
  | { type: 'RESET_DESIGN' };

// 4. Reducer function
function creatorReducer(state: CreatorState, action: Action): CreatorState {
  switch (action.type) {
    // Configure
    case 'SET_USER_AUTH_MODE':
      return { ...state, userAuthMode: action.payload };
    case 'SET_ACCOUNT_ABSTRACTION_MODE':
      return { ...state, accountAbstractionMode: action.payload };
    case 'SET_SELECTED_NETWORKS':
      return { ...state, selectedNetworks: action.payload };
    case 'SET_SELECTED_TOKEN_SYMBOLS':
      return {
        ...state,
        selectedTokenSymbols: Array.from(new Set(action.payload)),
      };
    case 'SET_ENABLE_SELL_TOKEN':
      return { ...state, enableSellToken: action.payload };
    case 'SET_AUTO_SELECT_TOP_BALANCE_TOKEN':
      return { ...state, autoSelectTopBalanceToken: action.payload };
    case 'SET_DEFAULT_SELL_TOKEN':
      return {
        ...state,
        defaultSellToken: action.payload,
      };
    case 'SET_ENABLE_BUY_TOKEN':
      return { ...state, enableBuyToken: action.payload };
    case 'SET_DEFAULT_BUY_TOKEN':
      return {
        ...state,
        defaultBuyToken: action.payload,
      };
    case 'SET_ENABLE_CUSTOM_FEES':
      return { ...state, enableCustomFees: action.payload };
    case 'SET_FEE_PERCENTAGE':
      return { ...state, feePercentage: action.payload };
    case 'SET_COLLECTOR_ADDRESS':
      return { ...state, collectorAddress: action.payload };

    // Design
    case 'SET_ALLOW_TOGGLE_MODES':
      return { ...state, allowToggleModes: action.payload };
    case 'SET_DEFAULT_MODE':
      return { ...state, defaultMode: action.payload };
    case 'SET_STYLE_PRESET':
      return { ...state, stylePreset: action.payload };
    case 'SET_CORNER_RADIUS':
      return { ...state, cornerRadius: action.payload };
    case 'SET_SHOW_CONTAINER_WRAPPER':
      return { ...state, showContainerWrapper: action.payload };
    case 'SET_PRIMARY_COLOR':
      return { ...state, primaryColor: action.payload };
    case 'SET_SURFACE_COLOR':
      return { ...state, surfaceColor: action.payload };
    case 'SET_BACKGROUND_COLOR':
      return { ...state, backgroundColor: action.payload };
    case 'SET_SUCCESS_COLOR':
      return { ...state, successColor: action.payload };
    case 'SET_WARNING_COLOR':
      return { ...state, warningColor: action.payload };
    case 'SET_ALERT_COLOR':
      return { ...state, alertColor: action.payload };
    case 'RESET_DESIGN':
      return {
        ...state,
        allowToggleModes: true,
        defaultMode: 'auto',
        stylePreset: 'clean',
        cornerRadius: 'm',
        showContainerWrapper: false,
        primaryColor: '#D5B7FF',
        surfaceColor: '#24262D',
        backgroundColor: '#24262D',
        successColor: '#98FFB5',
        warningColor: '#FADFAD',
        alertColor: '#FFB8BE',
      };
    case 'RESET_ALL':
      return initialState;
    default:
      return state;
  }
}

type CreatorContextType = {
  state: CreatorState;
  dispatch: React.Dispatch<Action>;
};

export const CreatorContext = createContext<CreatorContextType | undefined>(
  undefined,
);

type CreatorProviderProps = {
  children: ReactNode;
};

export function CreatorProvider({ children }: CreatorProviderProps) {
  const [state, dispatch] = useReducer(creatorReducer, initialState);

  return (
    <CreatorContext.Provider value={{ state, dispatch }}>
      {children}
    </CreatorContext.Provider>
  );
}
