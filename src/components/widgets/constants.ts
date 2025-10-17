export const TOKEN_INPUT = {
  SOURCE: 'source',
  TARGET: 'target',
} as const;

export const TOKEN_MODAL_STATE = {
  ...TOKEN_INPUT,
  NONE: 'none',
} as const;

export const QUOTE_TYPE = {
  EXACT_IN: 'exact_in',
  EXACT_OUT: 'exact_out',
} as const;

export type TokenModalState =
  (typeof TOKEN_MODAL_STATE)[keyof typeof TOKEN_MODAL_STATE];
export type TokenInputType = (typeof TOKEN_INPUT)[keyof typeof TOKEN_INPUT];
export type QuoteType = (typeof QUOTE_TYPE)[keyof typeof QUOTE_TYPE];
