import { useState } from 'react';
import { AddW700 as Add } from '@material-symbols-svg/react-rounded/icons/add';

import { Button } from '@/uikit/Button';
import { TERMS_URL } from '@/constants';

type Props = {
  label?: string;
  isLoading: boolean;
  onClick: () => void;
};

export const CreateApiKey = ({
  label = 'Create API key',
  isLoading,
  onClick,
}: Props) => {
  const [accepted, setAccepted] = useState(false);
  const disabled = !accepted && !isLoading;

  return (
    <div className="py-csw-2xl mt-csw-2xl border-t border-csw-gray-900">
      <label className="flex gap-csw-md items-start mb-csw-lg cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer accent-csw-accent-600"
        />
        <span className="font-medium text-sm leading-5 tracking-[-0.4px] text-csw-gray-200">
          I have read and agree to the{' '}
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noreferrer"
            className="text-csw-gray-50 underline"
            onClick={(event) => event.stopPropagation()}>
            Terms and Conditions
          </a>
          .
        </span>
      </label>

      <Button
        fluid
        size="sm"
        variant={disabled ? 'disabled' : 'primary'}
        detail="accent"
        state={isLoading ? 'loading' : 'default'}
        className="w-full"
        icon={Add}
        onClick={onClick}>
        {label}
      </Button>
    </div>
  );
};
