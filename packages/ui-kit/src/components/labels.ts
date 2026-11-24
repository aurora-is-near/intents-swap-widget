/**
 * The label row around a `Switch` or `Checkbox`: `display:flex;
 * align-items:center;gap:12px` with 16px text (Web-Borrow.dc.html lines
 * 312–314 and 635–637). A disabled control dims its row's cursor.
 */
export const CONTROL_LABEL =
  'inline-flex cursor-pointer items-center gap-[12px] font-sans text-[16px] text-ink has-data-disabled:cursor-not-allowed';

/**
 * A visible label above a `TextField` or `AmountInput`: the section label
 * over the amount box (`.lbl`, line 145, as used on line 216: 12px, 0.14em
 * tracking, `mut2`, margin-bottom 8px).
 */
export const FIELD_LABEL =
  'mb-[8px] block font-sans text-[12px] tracking-[0.14em] text-mut2';

/**
 * The artboards' hidden field label (lines 225 and 317:
 * `position:absolute;width:1px;height:1px;overflow:hidden;clip:…`).
 */
export const HIDDEN_LABEL = 'sr-only';
