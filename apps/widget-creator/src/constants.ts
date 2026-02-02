import type { Fee, FeeConfig } from 'intents-1click-rule-engine';

export const DEFAULT_ACCENT_COLOR = '#C398FF';
export const DEFAULT_BACKGROUND_COLOR = '#24262D';
export const DEFAULT_WARNING_COLOR_LIGHT = '#FADFAD';
export const DEFAULT_WARNING_COLOR_DARK = '#A87A04';
export const DEFAULT_ERROR_COLOR_LIGHT = '#FFB8BE';
export const DEFAULT_ERROR_COLOR_DARK = '#9F002B';
export const DEFAULT_SUCCESS_COLOR_LIGHT = '#98FFB5';
export const DEFAULT_SUCCESS_COLOR_DARK = '#00652F';

export const PRIVY_APP_ID = 'cmkzn6yvs0324kz0cp0pf50v1';

export const DEFAULT_ZERO_FEE: Omit<FeeConfig, 'default_fee'> & {
  default_fee: Fee;
} = {
  version: '1.0.0',
  rules: [],
  default_fee: {
    bps: 0,
    type: 'bps',
    recipient: '',
  },
};
