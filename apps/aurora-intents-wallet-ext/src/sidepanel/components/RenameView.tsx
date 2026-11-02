import { useState } from 'react';

import { Button, Input } from '@aurora-is-near/intents-swap-widget';

import { Screen } from './Screen';

type Props = {
  title: string;
  label: string;
  value: string;
  /** What is being renamed, under the field. */
  description: string;
  onSave: (name: string) => void | Promise<void>;
  onCancel: () => void;
};

/** A screen with one name field: renaming an account or a wallet. */
export const RenameView = ({
  title,
  label,
  value,
  description,
  onSave,
  onCancel,
}: Props) => {
  const [name, setName] = useState(value);

  return (
    <Screen
      title={title}
      onBack={onCancel}
      footer={
        <>
          <Button
            variant="primary"
            size="lg"
            state={name.trim() ? 'default' : 'disabled'}
            onClick={() => onSave(name.trim())}>
            Save
          </Button>
          <Button variant="outlined" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        </>
      }>
      <label className="flex flex-col gap-sw-md">
        <span className="text-sw-label-sm text-sw-gray-200">{label}</span>
        <Input
          defaultValue={value}
          placeholder={label}
          maxLength={32}
          focusOnMount
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <p className="m-0 text-sw-body-sm text-sw-gray-300">{description}</p>
    </Screen>
  );
};
