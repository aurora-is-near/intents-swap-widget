import { Field } from '@base-ui/react/field';
import { Input } from '@base-ui/react/input';
import {
  forwardRef,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { keptCharacters, sanitizeAmountInput } from '../../utils/amount';
import { cn } from '../../utils/cn';
import { FIELD_LABEL, HIDDEN_LABEL } from '../../utils/labels';

/**
 * `.amtbox` (Web-Borrow.dc.html line 224): border 1.5px `bd2`, radius 14,
 * padding 8px 16px, `sf3`, a column centred vertically; focus-within turns
 * the border ink (line 49). No disabled look on the artboards:
 * `.go:disabled`'s opacity (line 57).
 */
const BOX =
  'box-border flex min-w-0 flex-col justify-center rounded-14 border-1.5 border-solid border-bd2 bg-sf3 px-4 py-2 focus-within:border-ink has-disabled:opacity-50';

/**
 * `.amt` (line 226; lines 45–48): 30px / 700 / -0.02em, ink, no border,
 * background or outline; placeholder `mut3`. A text input, so there are no
 * spin buttons to hide.
 */
const INPUT =
  'block w-full min-w-0 border-0 bg-transparent p-0 font-sans text-30 font-bold tracking-title text-ink outline-none placeholder:text-mut3 disabled:cursor-not-allowed';

/** The line under the amount (line 227): 12px `mut2`. */
const SECONDARY = 'font-sans text-12 text-mut2';

export type AmountInputProps = Omit<
  Input.Props,
  | 'className'
  | 'render'
  | 'children'
  | 'value'
  | 'defaultValue'
  | 'onValueChange'
  | 'onChange'
  | 'type'
  | 'inputMode'
> & {
  /** The amount as typed, a plain decimal string such as `1.5`. */
  value: string;
  /** Called with the cleaned string (see `sanitizeAmountInput`). */
  onValueChange: (value: string) => void;
  /** The most fraction digits the amount may have, such as a token's decimals. */
  decimals?: number;
  /** The field's name; always the input's accessible name. */
  label: ReactNode;
  /** Hides the label visually, as the artboards do; screen readers read it. */
  hideLabel?: boolean;
  /** The line under the amount, such as `≈ $1,234.00`. */
  secondary?: ReactNode;
  /** Classes for the outer field wrapper. */
  className?: string;
};

/**
 * Where the caret goes in `next` (the cleaned `raw`) when it was at `caret`
 * in `raw`: the length of the text before the caret once cleaned.
 *
 * The text before the caret cleans the same way alone as inside the whole
 * value, except for a run of leading zeros, which may go on after the caret.
 * Cleaning keeps at most the run's last zero (none when a digit follows), so
 * when only zeros are before the caret, the caret is after a kept zero only
 * if the run ends before the caret and `next` kept a zero:
 * `0|12` → `|12`, `0|0` → `|0`, `0|.5` → `0|.5`.
 */
const caretAfterCleaning = (
  raw: string,
  caret: number,
  next: string,
  decimals: number | undefined,
): number => {
  const head = raw.slice(0, caret);

  if (/^0+$/.test(keptCharacters(head))) {
    const runGoesOn = keptCharacters(raw.slice(caret)).startsWith('0');

    return next.startsWith('0') && !runGoesOn ? 1 : 0;
  }

  return sanitizeAmountInput(head, decimals).length;
};

/**
 * The big amount field. A text input with the decimal keypad
 * (`inputMode="decimal"`), not `type="number"`: the value stays a string, so
 * token amounts never round through a float. Each edit is cleaned by
 * `sanitizeAmountInput`; an edit that changes nothing (a letter, a second
 * dot) is dropped.
 *
 * Cleaning rewrites the text (`,` → `.`) or drops the edit, and React then
 * writes the value back, which moves the caret to the end. So the caret is
 * put back where the cleaned edit leaves it: the length of the cleaned text
 * before the caret.
 */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  (
    {
      value,
      onValueChange,
      decimals,
      label,
      hideLabel = false,
      secondary,
      disabled,
      className,
      placeholder = '0',
      ...props
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    // Where the caret goes after the edit being handled, if anywhere.
    const caretRef = useRef<number | null>(null);
    // Counts edits, so a dropped edit still re-renders and restores the caret.
    const [edits, setEdits] = useState(0);

    const setRefs = useCallback(
      (node: HTMLElement | null) => {
        const input = node instanceof HTMLInputElement ? node : null;

        inputRef.current = input;

        if (typeof ref === 'function') {
          ref(input);
        } else if (ref) {
          ref.current = input;
        }
      },
      [ref],
    );

    useLayoutEffect(() => {
      const input = inputRef.current;
      const caret = caretRef.current;

      caretRef.current = null;

      if (input && caret !== null && input === document.activeElement) {
        const position = Math.min(caret, input.value.length);

        input.setSelectionRange(position, position);
      }
    }, [edits]);

    return (
      <Field.Root className={cn('min-w-0', className)} disabled={disabled}>
        <Field.Label className={hideLabel ? HIDDEN_LABEL : FIELD_LABEL}>
          {label}
        </Field.Label>
        <div className={BOX}>
          <Input
            ref={setRefs}
            autoComplete="off"
            className={INPUT}
            inputMode="decimal"
            onValueChange={(raw) => {
              const next = sanitizeAmountInput(raw, decimals);
              const selectionStart = inputRef.current?.selectionStart;

              caretRef.current =
                selectionStart == null
                  ? null
                  : caretAfterCleaning(raw, selectionStart, next, decimals);
              setEdits((count) => count + 1);

              if (next !== value) {
                onValueChange(next);
              }
            }}
            placeholder={placeholder}
            spellCheck={false}
            type="text"
            value={value}
            {...props}
          />
          {secondary != null && <div className={SECONDARY}>{secondary}</div>}
        </div>
      </Field.Root>
    );
  },
);

AmountInput.displayName = 'AmountInput';
