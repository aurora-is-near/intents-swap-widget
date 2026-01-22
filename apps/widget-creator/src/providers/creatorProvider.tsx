import {
  CHAINS,
  Chains,
  ThemeBorderRadius,
} from '@aurora-is-near/intents-swap-widget';
import React, { createContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import { ThemeColorPickerId } from '../types/colors';

type CreatorState = {
  // Configure - User authentication
  userAuthMode: 'standalone' | 'dapp';
  // Configure - Account abstraction
  accountAbstractionMode: 'enabled' | 'disabled';
  // Configure - Networks
  selectedNetworks: Chains[];
  // Configure - Tokens
  selectedTokenSymbols: string[];
  enableSellToken: boolean;
  defaultSellToken: { symbol: string; blockchain: Chains };
  enableBuyToken: boolean;
  defaultBuyToken: { symbol: string; blockchain: Chains };
  // Configure - Fee collection
  enableCustomFees: boolean;
  feePercentage: string;
  collectorAddress: string;
  // Design - Style
  stylePreset: 'clean' | 'bold';
  borderRadius: ThemeBorderRadius;
  showContainerWrapper: boolean;
  // Design - Colors
  accentColor: string;
  backgroundColor: string;
  containerColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  openThemeColorPickerId: ThemeColorPickerId | null;
};

const initialState: CreatorState = {
  userAuthMode: 'standalone',
  accountAbstractionMode: 'enabled',
  selectedNetworks: CHAINS.map((chain) => chain.id),
  selectedTokenSymbols: [],
  enableSellToken: true,
  defaultSellToken: { symbol: 'USDT', blockchain: 'near' },
  enableBuyToken: false,
  defaultBuyToken: { symbol: 'USDT', blockchain: 'eth' },
  enableCustomFees: false,
  feePercentage: '1',
  collectorAddress: '0x92c21eB298128FDE1b7f8A9332910A614DC7df0A',
  // Design
  stylePreset: 'clean',
  borderRadius: 'md',
  showContainerWrapper: false,
  accentColor: '#D5B7FF',
  backgroundColor: '#24262D',
  containerColor: '#000000',
  successColor: '#98FFB5',
  warningColor: '#FADFAD',
  errorColor: '#FFB8BE',
  openThemeColorPickerId: null,
};

type Action =
  // Configure - User authentication
  | { type: 'SET_USER_AUTH_MODE'; payload: 'standalone' | 'dapp' }
  // Configure - Account abstraction
  | { type: 'SET_ACCOUNT_ABSTRACTION_MODE'; payload: 'enabled' | 'disabled' }
  // Configure - Networks
  | { type: 'SET_SELECTED_NETWORKS'; payload: Chains[] }
  // Configure - Tokens
  | { type: 'SET_SELECTED_TOKEN_SYMBOLS'; payload: string[] }
  | { type: 'SET_ENABLE_SELL_TOKEN'; payload: boolean }
  | {
      type: 'SET_DEFAULT_SELL_TOKEN';
      payload: { symbol: string; blockchain: Chains };
    }
  | { type: 'SET_ENABLE_BUY_TOKEN'; payload: boolean }
  | {
      type: 'SET_DEFAULT_BUY_TOKEN';
      payload: { symbol: string; blockchain: Chains };
    }
  // Configure - Fee collection
  | { type: 'SET_ENABLE_CUSTOM_FEES'; payload: boolean }
  | { type: 'SET_FEE_PERCENTAGE'; payload: string }
  | { type: 'SET_COLLECTOR_ADDRESS'; payload: string }
  // Design - Style
  | { type: 'SET_STYLE_PRESET'; payload: 'clean' | 'bold' }
  | { type: 'SET_BORDER_RADIUS'; payload: ThemeBorderRadius }
  | { type: 'SET_SHOW_CONTAINER_WRAPPER'; payload: boolean }
  // Design - Colors
  | { type: 'SET_ACCENT_COLOR'; payload: string }
  | { type: 'SET_BACKGROUND_COLOR'; payload: string }
  | { type: 'SET_CONTAINER_COLOR'; payload: string }
  | { type: 'SET_SUCCESS_COLOR'; payload: string }
  | { type: 'SET_WARNING_COLOR'; payload: string }
  | { type: 'SET_ERROR_COLOR'; payload: string }
  | {
      type: 'SET_OPEN_THEME_COLOR_PICKER_ID';
      payload: ThemeColorPickerId | null;
    }
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
    case 'SET_STYLE_PRESET':
      return { ...state, stylePreset: action.payload };
    case 'SET_BORDER_RADIUS':
      return { ...state, borderRadius: action.payload };
    case 'SET_SHOW_CONTAINER_WRAPPER':
      return { ...state, showContainerWrapper: action.payload };
    case 'SET_ACCENT_COLOR':
      return { ...state, accentColor: action.payload };
    case 'SET_BACKGROUND_COLOR':
      return { ...state, backgroundColor: action.payload };
    case 'SET_CONTAINER_COLOR':
      return { ...state, containerColor: action.payload };
    case 'SET_SUCCESS_COLOR':
      return { ...state, successColor: action.payload };
    case 'SET_WARNING_COLOR':
      return { ...state, warningColor: action.payload };
    case 'SET_ERROR_COLOR':
      return { ...state, errorColor: action.payload };
    case 'SET_OPEN_THEME_COLOR_PICKER_ID':
      return { ...state, openThemeColorPickerId: action.payload };
    case 'RESET_DESIGN':
      return {
        ...state,
        stylePreset: 'clean',
        borderRadius: 'md',
        showContainerWrapper: false,
        accentColor: '#D5B7FF',
        backgroundColor: '#24262D',
        containerColor: '#000000',
        successColor: '#98FFB5',
        warningColor: '#FADFAD',
        errorColor: '#FFB8BE',
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
