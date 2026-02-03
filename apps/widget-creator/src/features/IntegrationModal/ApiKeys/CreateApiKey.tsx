import { AddW700 as Add } from '@material-symbols-svg/react-rounded/icons/add';

import { Button } from '@/uikit/Button';

type Props = {
  isLoading: boolean;
  onClick: () => void;
};

export const CreateApiKey = ({ isLoading, onClick }: Props) => (
  <div className="flex flex-col gap-csw-lg py-csw-2xl mt-csw-2xl border-t border-csw-gray-900">
    <Button
      fluid
      size="sm"
      variant="primary"
      detail="accent"
      state={isLoading ? 'loading' : 'default'}
      className="w-full"
      icon={Add}
      onClick={onClick}>
      Create API key
    </Button>
    <p className="text-csw-body-sm text-csw-gray-600 text-center">
      By creating an API key, you agree to the{' '}
      <a
        href="https://aurora-labs.gitbook.io/intents-swap-widget/terms-of-service"
        target="_blank"
        rel="noopener noreferrer"
        className="underline">
        Terms of Service
      </a>{' '}
      and{' '}
      <a
        href="https://aurora-labs.gitbook.io/intents-swap-widget/privacy-policy"
        target="_blank"
        rel="noopener noreferrer"
        className="underline">
        Privacy Policy
      </a>
      .
    </p>
  </div>
);
