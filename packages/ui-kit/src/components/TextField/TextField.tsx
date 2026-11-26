import { Field } from '@base-ui/react/field';
import { Input } from '@base-ui/react/input';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '../../utils/cn';
import { FIELD_LABEL, HIDDEN_LABEL } from '../../utils/labels';

/**
 * The recipient box (Web-Borrow.dc.html line 317): border 1.5px `bd2`,
 * radius 12, padding 11px 14px, `sf`; `.amtbox:focus-within` turns the
 * border ink (line 49). The artboards have no error look: an invalid field
 * takes the `neg` border. No disabled look either: `.go:disabled`'s opacity
 * (line 57).
 */
const BOX =
  'box-border rounded-12 border-1.5 border-solid border-bd2 bg-sf px-3.5 py-2.75 focus-within:border-ink group-data-invalid/field:border-neg group-data-disabled/field:opacity-50';

/** The input on line 317: 14px, ink, no border, background or outline. */
const INPUT =
  'block w-full min-w-0 border-0 bg-transparent p-0 font-sans text-14 text-ink outline-none disabled:cursor-not-allowed';

/** No error text on the artboards: 13px `neg`, under the box. */
const ERROR = 'mt-1.5 font-sans text-13 text-neg';

export type TextFieldProps = Omit<
  Input.Props,
  'className' | 'render' | 'children'
> & {
  /** The field's name; always the input's accessible name. */
  label: ReactNode;
  /** Hides the label visually, as the artboards do; screen readers read it. */
  hideLabel?: boolean;
  /** An error message. Marks the input invalid and describes it. */
  error?: ReactNode;
  /** Classes for the outer field wrapper. */
  className?: string;
};

/**
 * A single-line text input in the kit's box, on Base UI's `Field` and
 * `Input`. Takes the native input props; autocomplete and spellcheck are off
 * by default, as on the artboard's address field.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      hideLabel = false,
      error,
      disabled,
      className,
      autoComplete = 'off',
      spellCheck = false,
      ...props
    },
    ref,
  ) => {
    const invalid = error != null && error !== false;

    return (
      <Field.Root
        className={cn('group/field min-w-0', className)}
        disabled={disabled}
        invalid={invalid}>
        <Field.Label className={hideLabel ? HIDDEN_LABEL : FIELD_LABEL}>
          {label}
        </Field.Label>
        <div className={BOX}>
          <Input
            ref={ref}
            autoComplete={autoComplete}
            className={INPUT}
            spellCheck={spellCheck}
            {...props}
          />
        </div>
        {invalid && (
          <Field.Error className={ERROR} match>
            {error}
          </Field.Error>
        )}
      </Field.Root>
    );
  },
);

TextField.displayName = 'TextField';
