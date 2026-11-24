import { Checkbox, TextField } from '@aurora-is-near/ui-kit';
import { useState } from 'react';

import { validateRecipient } from './model/recipient';

/** An EVM address's length, `0x` and 40 hex digits. */
const ADDRESS_LENGTH = 42;

type RecipientFieldProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * "Send borrowed funds to another wallet" (Web-Borrow.dc.html lines
 * 311–319): 20px under the slider, above a 1px `bd` rule with 16px padding;
 * the checkbox reveals the address box 12px under it. EVM addresses only,
 * placeholder `0x…` (decided: no ENS). An invalid address shows its error
 * once the field is left or a full address's length is reached, so typing
 * one out is not flagged on its first character.
 */
export function RecipientField({
  enabled,
  onEnabledChange,
  value,
  onValueChange,
}: RecipientFieldProps) {
  const [left, setLeft] = useState(false);
  const check = validateRecipient(value);
  const showError =
    check.status === 'invalid' &&
    (left || value.trim().length >= ADDRESS_LENGTH);

  return (
    <div className="mt-[20px] border-0 border-t border-solid border-bd pt-[16px]">
      <Checkbox
        checked={enabled}
        label="Send borrowed funds to another wallet"
        onCheckedChange={(checked) => {
          setLeft(false);
          onEnabledChange(checked);
        }}
      />
      {enabled ? (
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
