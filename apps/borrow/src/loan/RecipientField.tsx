import { Checkbox, TextField } from '@aurora-is-near/ui-kit';
import { useId, useState } from 'react';

import { validateRecipient } from './model/recipient';

/** An EVM address's length, `0x` and 40 hex digits. */
const ADDRESS_LENGTH = 42;

type RecipientFieldProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  /**
   * Why a recipient is required, such as "Required: your wallet can't
   * receive on Base". When set, the box is on and locked, and this line
   * shows under it.
   */
  lockedReason?: string;
};

/**
 * "Send borrowed funds to another wallet" (Web-Borrow.dc.html lines
 * 311–319): 20px under the slider, above a 1px `bd` rule with 16px padding;
 * the checkbox reveals the address box 12px under it. EVM addresses only,
 * placeholder `0x…` (decided: no ENS). An invalid address shows its error
 * once the field is left or a full address's length is reached, so typing
 * one out is not flagged on its first character.
 *
 * With `lockedReason` (a non-EVM wallet, which can't receive on the market's
 * chain), the box is checked and disabled, and the reason shows under it in
 * 13px `mut`, the style of the field's error line. No artboard draws this
 * state.
 */
export function RecipientField({
  enabled,
  onEnabledChange,
  value,
  onValueChange,
  lockedReason,
}: RecipientFieldProps) {
  const [left, setLeft] = useState(false);
  const reasonId = useId();
  const locked = lockedReason !== undefined;
  const open = enabled || locked;
  const check = validateRecipient(value);
  const showError =
    check.status === 'invalid' &&
    (left || value.trim().length >= ADDRESS_LENGTH);

  return (
    <div className="mt-[20px] border-0 border-t border-solid border-bd pt-[16px]">
      <Checkbox
        aria-describedby={locked ? reasonId : undefined}
        checked={open}
        disabled={locked}
        label="Send borrowed funds to another wallet"
        onCheckedChange={(checked) => {
          setLeft(false);
          onEnabledChange(checked);
        }}
      />
      {locked ? (
        <p
          className="m-0 mt-[6px] font-sans text-[13px] text-mut"
          id={reasonId}>
          {lockedReason}
        </p>
      ) : null}
      {open ? (
        <TextField
          className="mt-[12px]"
          error={showError ? 'Enter a valid EVM address (0x…)' : undefined}
          hideLabel
          label="Recipient wallet address"
          placeholder="0x…"
          value={value}
          onBlur={() => setLeft(true)}
          onChange={(event) => onValueChange(event.target.value)}
        />
      ) : null}
    </div>
  );
}
