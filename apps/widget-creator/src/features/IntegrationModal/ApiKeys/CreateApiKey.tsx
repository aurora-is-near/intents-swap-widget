import { type ReactNode, useState } from 'react';
import { AddW700 as Add } from '@material-symbols-svg/react-rounded/icons/add';

import { Button } from '@/uikit/Button';
import { PRIVACY_URL, TERMS_URL } from '@/constants';

type Props = {
  label?: string;
  isLoading: boolean;
  // Whether the user has already accepted the terms (recorded server-side when a
  // key was previously created). When true the checkbox gate is replaced by a
  // passive footer and key creation is unblocked.
  alreadyAccepted: boolean;
  onClick: () => void;
};

const TermsLink = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="text-csw-gray-50 underline"
    onClick={(event) => event.stopPropagation()}>
    {children}
  </a>
);

export const CreateApiKey = ({
  label = 'Create API key',
  isLoading,
  alreadyAccepted,
  onClick,
}: Props) => {
  const [accepted, setAccepted] = useState(false);
  const disabled = !alreadyAccepted && !accepted && !isLoading;

  return (
    <div className="py-csw-2xl mt-csw-2xl border-t border-csw-gray-900">
      {!alreadyAccepted && (
        <label className="flex gap-csw-md items-start mb-csw-lg cursor-pointer rounded-csw-lg border border-csw-gray-800 px-csw-lg py-csw-lg">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer accent-csw-accent-600"
          />
          <span className="font-medium text-sm leading-5 tracking-[-0.4px] text-csw-gray-200">
            I have read and agree to the{' '}
            <TermsLink href={TERMS_URL}>Terms of Service</TermsLink> and{' '}
            <TermsLink href={PRIVACY_URL}>Privacy Policy</TermsLink>.
          </span>
        </label>
      )}

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

      {alreadyAccepted && (
        <p className="mt-csw-lg text-center font-medium text-sm leading-5 tracking-[-0.4px] text-csw-gray-300">
          The <TermsLink href={TERMS_URL}>Terms of Service</TermsLink> and{' '}
          <TermsLink href={PRIVACY_URL}>Privacy Policy</TermsLink> apply.
        </p>
      )}
    </div>
  );
};
